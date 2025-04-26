"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Circle } from 'lucide-react';

interface CircleType {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

export default function Home() {
  const [circles, setCircles] = useState<CircleType[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const [circleRadius, setCircleRadius] = useState(50);
  const [circleColor, setCircleColor] = useState("#008080");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(zoom, zoom);

    circles.forEach((circle) => {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
      ctx.fillStyle = circle.color;
      ctx.fill();
      ctx.stroke();
    });
  }, [circles, zoom, circleRadius, circleColor]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    let clickedCircle: CircleType | null = null;
    for (let i = circles.length - 1; i >= 0; i--) {
      const circle = circles[i];
      const distance = Math.sqrt((x - circle.x) ** 2 + (y - circle.y) ** 2);
      if (distance <= circle.radius) {
        clickedCircle = circle;
        break;
      }
    }

    if (clickedCircle) {
      setSelectedCircle(clickedCircle.id);
    } else {
      setSelectedCircle(null);
      const newCircle = {
        id: generateId(),
        x: x,
        y: y,
        radius: circleRadius,
        color: circleColor,
      };
      setCircles([...circles, newCircle]);
    }
  };

  const handleRadiusChange = (value: number[]) => {
    setCircleRadius(value[0]);
    if (selectedCircle) {
      setCircles((prevCircles) =>
        prevCircles.map((circle) =>
          circle.id === selectedCircle ? { ...circle, radius: value[0] } : circle
        )
      );
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCircleColor(e.target.value);
    if (selectedCircle) {
      setCircles((prevCircles) =>
        prevCircles.map((circle) =>
          circle.id === selectedCircle ? { ...circle, color: e.target.value } : circle
        )
      );
    }
  };

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    canvas.style.cursor = 'grabbing';
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedCircle) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - dragOffset.x) / zoom;
    const y = (e.clientY - rect.top - dragOffset.y) / zoom;

    setCircles((prevCircles) =>
      prevCircles.map((circle) =>
        circle.id === selectedCircle ? { ...circle, x: x, y: y } : circle
      )
    );
  };

  const handleCircleDelete = () => {
    if (selectedCircle) {
      setCircles((prevCircles) =>
        prevCircles.filter((circle) => circle.id !== selectedCircle)
      );
      setSelectedCircle(null);
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
          <div>
            <label htmlFor="radius" className="block text-sm font-medium text-foreground">
              Radius: {circleRadius}
            </label>
            <Slider
              id="radius"
              defaultValue={[circleRadius]}
              min={10}
              max={100}
              step={1}
              onValueChange={handleRadiusChange}
              className="w-32"
            />
          </div>
          <div>
            <label htmlFor="colorPicker" className="block text-sm font-medium text-foreground">
              Color:
            </label>
            <Input
              type="color"
              id="colorPicker"
              value={circleColor}
              onChange={handleColorChange}
              className="w-24 h-10"
            />
          </div>
          <div>
            <label htmlFor="zoom" className="block text-sm font-medium text-foreground">
              Zoom: {zoom.toFixed(1)}x
            </label>
            <Slider
              id="zoom"
              defaultValue={[zoom]}
              min={0.5}
              max={2}
              step={0.1}
              onValueChange={handleZoomChange}
              className="w-32"
            />
          </div>
          <Button variant="destructive" size="sm" onClick={handleCircleDelete} disabled={!selectedCircle}>
            Delete Circle
          </Button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
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
