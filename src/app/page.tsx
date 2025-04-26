"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Circle } from 'lucide-react';

interface CircleType {
  id: string;
  x: number;
  y: number;
}

const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

export default function Home() {
  const [circles, setCircles] = useState<CircleType[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lines, setLines] = useState<[string, string][]>([]);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [lineStartCircle, setLineStartCircle] = useState<string | null>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });

  const circleRadius = 25;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save the current transformation matrix
    ctx.save();

    // Apply pan and zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw lines first
    lines.forEach(([startId, endId]) => {
      const startCircle = circles.find((c) => c.id === startId);
      const endCircle = circles.find((c) => c.id === endId);

      if (startCircle && endCircle) {
        ctx.beginPath();
        ctx.moveTo(startCircle.x, startCircle.y);
        ctx.lineTo(endCircle.x, endCircle.y);
        ctx.stroke();
      }
    });

    // Then draw circles
    circles.forEach((circle) => {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circleRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'black';
      ctx.stroke();
    });

    // Restore the transformation matrix
    ctx.restore();
  }, [circles, zoom, lines, pan]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    let clickedCircle: CircleType | null = null;
    for (let i = circles.length - 1; i >= 0; i--) {
      const circle = circles[i];
      const distance = Math.sqrt((x - circle.x) ** 2 + (y - circle.y) ** 2);
      if (distance <= circleRadius) {
        clickedCircle = circle;
        break;
      }
    }

    if (isDrawingLine) {
      if (clickedCircle) {
        // End line drawing
        if (lineStartCircle && lineStartCircle !== clickedCircle.id) {
          setLines([...lines, [lineStartCircle, clickedCircle.id]]);
        }
        setIsDrawingLine(false);
        setLineStartCircle(null);
      } else {
        setIsDrawingLine(false);
        setLineStartCircle(null);
      }
    } else {
      if (clickedCircle) {
        setSelectedCircle(clickedCircle.id);
      } else {
        setSelectedCircle(null);
        const newCircle = {
          id: generateId(),
          x: x,
          y: y,
        };
        setCircles([...circles, newCircle]);
      }
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let clickedCircle: CircleType | null = null;
    for (let i = circles.length - 1; i >= 0; i--) {
      const circle = circles[i];
      const distance = Math.sqrt(((x - pan.x) / zoom - circle.x) ** 2 + ((y - pan.y) / zoom - circle.y) ** 2);
      if (distance <= circleRadius * zoom) {
        clickedCircle = circle;
        break;
      }
    }

    if (clickedCircle) {
      setIsDragging(true);
      setSelectedCircle(clickedCircle.id);
      setDragOffset({
        x: x - clickedCircle.x * zoom - pan.x,
        y: y - clickedCircle.y * zoom - pan.y,
      });
      canvas.style.cursor = 'grabbing';
    } else {
      setIsDragging(true);
      setSelectedCircle(null);
      setDragOffset({
        x: x - pan.x,
        y: y - pan.y,
      });
      canvas.style.cursor = 'grab';
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedCircle) {
      setCircles((prevCircles) =>
        prevCircles.map((circle) =>
          circle.id === selectedCircle
            ? {
              ...circle,
              x: (x - dragOffset.x - pan.x) / zoom,
              y: (y - dragOffset.y - pan.y) / zoom,
            }
            : circle
        )
      );
    } else {
      // Panning the canvas
      setPan({
        x: x - dragOffset.x,
        y: y - dragOffset.y,
      });
    }
  };


  const handleStartLine = () => {
    if (selectedCircle) {
      setIsDrawingLine(true);
      setLineStartCircle(selectedCircle);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-secondary p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Circle className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold">Circle Canvas</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={handleStartLine} disabled={isDrawingLine || !selectedCircle}>
            {isDrawingLine ? "Drawing Line..." : "Draw Line"}
          </Button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1600}
          height={1200}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseMove={handleCanvasMouseMove}
          style={{ cursor: 'default', touchAction: 'none' }}
          className="border border-border shadow-md"
        />
      </div>
    </div>
  );
}
