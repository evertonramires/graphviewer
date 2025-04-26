"use client";

import React, { useState, useRef, useEffect } from "react";
import { Circle, Hand, Plus, MousePointer, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

type ToolType = 'hand' | 'circle' | 'select' | 'edge' | 'delete';

interface CircleType {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface EdgeType {
  id: string;
  start: string;
  end: string;
}

const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

const alphabet = 'abcdefghijklmnopqrstuvwxyz';

export default function Home() {
  const [circles, setCircles] = useState<CircleType[]>([]);
  const [edges, setEdges] = useState<EdgeType[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const [potentialEdge, setPotentialEdge] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<ToolType>('circle');
  const [hoveredCircle, setHoveredCircle] = useState<string | null>(null);
  const [isMiddleClicking, setIsMiddleClicking] = useState(false);
  const [selectedCircleCoords, setSelectedCircleCoords] = useState<{x:number|null, y:number|null}>({x:null, y:null});

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

    // Draw edges
    edges.forEach(edge => {
      const startCircle = circles.find(c => c.id === edge.start);
      const endCircle = circles.find(c => c.id === edge.end);

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
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = selectedCircle === circle.id || potentialEdge === circle.id ? 'teal' : 'black'; // Highlight selected circle
      ctx.lineWidth = selectedCircle === circle.id || potentialEdge === circle.id ? 3 : 1;
      ctx.stroke();
      ctx.lineWidth = 1;

      // Draw label
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '16px sans-serif';
      ctx.fillText(circle.label, circle.x, circle.y);
    });

    // Restore the transformation matrix
    ctx.restore();
  }, [circles, zoom, pan, selectedCircle, edges, circleRadius, potentialEdge]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'circle') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const newCircle = {
      id: generateId(),
      x: x,
      y: y,
      label: alphabet[circles.length % alphabet.length],
    };
    setCircles(prevCircles => [...prevCircles, newCircle]);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.button === 1) { // Middle click
      setIsMiddleClicking(true);
      setTool('hand');
      canvas.style.cursor = 'grab';
      setDragOffset({
        x: x - pan.x,
        y: y - pan.y,
      });
      setIsDragging(true);
      return;
    }

    let clickedCircle: CircleType | null = null;
    for (let i = circles.length - 1; i >= 0; i--) {
      const circle = circles[i];
      const distance = Math.sqrt(((x - pan.x) / zoom - circle.x) ** 2 + ((y - pan.y) / zoom - circle.y) ** 2);
      if (distance <= circleRadius) {
        clickedCircle = circle;
        break;
      }
    }

    setIsDragging(true);
    setDragOffset({
      x: x - pan.x,
      y: y - pan.y,
    });

    if (tool === 'hand') {
      canvas.style.cursor = 'grab';
    } else if (tool === 'select') {
      if (clickedCircle) {
        setSelectedCircle(clickedCircle.id);
        setSelectedCircleCoords({x: clickedCircle.x, y: clickedCircle.y});
        setDragOffset({
          x: x - clickedCircle.x * zoom - pan.x,
          y: y - clickedCircle.y * zoom - pan.y,
        });
        canvas.style.cursor = 'grabbing';
      } else {
        setPan({
          x: x - dragOffset.x,
          y: y - dragOffset.y,
        });
        canvas.style.cursor = 'grab';
      }
    } else if (tool === 'circle') {
      canvas.style.cursor = 'default';
    } else if (tool === 'delete') {
      if (clickedCircle) {
        setCircles(prevCircles => prevCircles.filter(c => c.id !== clickedCircle.id));
        setEdges(prevEdges => prevEdges.filter(e => e.start !== clickedCircle.id && e.end !== clickedCircle.id));
      }
    } else if (tool === 'edge') {
      if (clickedCircle) {
        if (potentialEdge) {
          // Create edge
          setEdges(prevEdges => [...prevEdges, { id: generateId(), start: potentialEdge, end: clickedCircle.id }]);
          setPotentialEdge(null);
          setTool('edge');
        } else {
          // Start edge
          setPotentialEdge(clickedCircle.id);
        }
      }
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      setIsMiddleClicking(false);
      setIsDragging(false);
      updateCanvasCursor(canvasRef.current);
      if (tool === 'hand'){
        setTool('select');
      }
      return;
    }
    setIsDragging(false);
    const canvas = canvasRef.current;
    if (canvas) {
      updateCanvasCursor(canvas);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isMiddleClicking || (tool === 'hand')) {
      // Panning the canvas
      canvas.style.cursor = 'grabbing';
      setPan({
        x: x - dragOffset.x,
        y: y - dragOffset.y,
      });
    } else if (tool === 'select' && selectedCircle) {
      setCircles((prevCircles) =>
        prevCircles.map((circle) =>
          circle.id === selectedCircle
            ? {
              ...circle,
              x: (x - dragOffset.x) / zoom,
              y: (y - dragOffset.y) / zoom,
            }
            : circle
        )
      );
    } else {
        canvas.style.cursor = 'grab';
        setPan({
          x: x - dragOffset.x,
          y: y - dragOffset.y,
        });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom + delta));

    // Calculate the focus point relative to the canvas
    const focusX = (mouseX - pan.x) / zoom;
    const focusY = (mouseY - pan.y) / zoom;

    // Adjust pan to keep the focus point under the mouse
    setPan((prevPan) => ({
      x: mouseX - focusX * newZoom,
      y: mouseY - focusY * newZoom,
    }));

    setZoom(newZoom);
  };

  const handleCanvasMouseLeave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      updateCanvasCursor(canvas);
    }
  };

  const updateCanvasCursor = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    if (isMiddleClicking) {
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (tool === 'select') {
      canvas.style.cursor = hoveredCircle ? 'pointer' : 'grab';
    } else if (tool === 'edge') {
      canvas.style.cursor = potentialEdge ? 'crosshair' : hoveredCircle ? 'pointer' : 'grab';
    }
    else {
      canvas.style.cursor = tool === 'hand' ? 'grab' : 'default';
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (tool === 'select' || tool === 'edge') {
      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let isOverCircle = false;
        for (let i = circles.length - 1; i >= 0; i--) {
          const circle = circles[i];
          const distance = Math.sqrt(((x - pan.x) / zoom - circle.x) ** 2 + ((y - pan.y) / zoom - circle.y) ** 2);
          if (distance <= circleRadius) {
            isOverCircle = true;
            setHoveredCircle(circle.id);
            canvas.style.cursor = 'pointer';
            break;
          }
        }
        if (!isOverCircle) {
          setHoveredCircle(null);
          canvas.style.cursor = 'grab';
        }
      };

      canvas.addEventListener('mousemove', handleMouseMove);

      return () => {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.style.cursor = 'default';
      };
    } else {
      canvas.style.cursor = tool === 'hand' ? 'grab' : 'default';
    }
  }, [tool, circles, pan, zoom, potentialEdge]);

  const isHandActive = tool === 'hand';
  const isCircleActive = tool === 'circle';
  const isSelectActive = tool === 'select';
  const isEdgeActive = tool === 'edge';
  const isDeleteActive = tool === 'delete';


  return (
    <div className="flex flex-col h-screen">
      <div className="bg-secondary p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Circle className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold">Circle Canvas</h1>
        </div>
      </div>
      <div className="bg-secondary p-4 flex items-center justify-start gap-2">
        <Button
          variant="outline"
          className={isHandActive ? 'bg-accent text-accent-foreground' : ''}
          onClick={() => {
            setTool('hand');
            setSelectedCircle(null);
            setHoveredCircle(null);
            const canvas = canvasRef.current;
            if (canvas) {
              canvas.style.cursor = 'grab';
            }
          }}
        >
          <Hand className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className={isCircleActive ? 'bg-accent text-accent-foreground' : ''}
          onClick={() => {
            setTool('circle');
            setSelectedCircle(null);
            setHoveredCircle(null);
            const canvas = canvasRef.current;
            if (canvas) {
              canvas.style.cursor = 'default';
            }
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className={isSelectActive ? 'bg-accent text-accent-foreground' : ''}
          onClick={() => {
            setTool('select');
            setSelectedCircle(null);
            setHoveredCircle(null);
          }}
        >
          <MousePointer className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className={isEdgeActive ? 'bg-accent text-accent-foreground' : ''}
          onClick={() => {
            setTool('edge');
            setSelectedCircle(null);
            setHoveredCircle(null);
          }}
        >
         Circle
        </Button>
        <Button
          variant="outline"
          className={isDeleteActive ? 'bg-accent text-accent-foreground' : ''}
          onClick={() => {
            setTool('delete');
            setSelectedCircle(null);
            setHoveredCircle(null);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
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
          onMouseLeave={handleCanvasMouseLeave}
          onWheel={handleWheel}
          style={{ touchAction: 'none', cursor: 'default' }}
          className="border border-border shadow-md"
        />
      </div>
      <div className="bg-secondary p-4 flex items-center justify-between">
        <div>
          Circles: {circles.length} Edges: {edges.length}
        </div>
        <div>
          {selectedCircle && (
            <span>
              Selected Circle: ({selectedCircleCoords.x}, {selectedCircleCoords.y})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
