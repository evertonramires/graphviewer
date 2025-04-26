"use client";

import React, { useState, useRef, useEffect } from "react";
import { Hand, Plus, MousePointer, Trash2, } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ArrowDownLeft } from 'lucide-react';

type ToolType = 'hand' | 'circle' | 'select' | 'edge' | 'delete' | 'paint';

interface CircleType {
  id: string;
  x: number;
  y: number;
  label: string;
  text: string;
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
  const [paintedCircles, setPaintedCircles] = useState<Set<string>>(new Set());

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
        const startX = startCircle.x;
        const startY = startCircle.y;
        const endX = endCircle.x;
        const endY = endCircle.y;

        // Calculate the angle for the start circle
        const angleStart = Math.atan2(endY - startY, endX - startX);
        const startXAdjusted = startX + circleRadius * Math.cos(angleStart);
        const startYAdjusted = startY + circleRadius * Math.sin(angleStart);

        // Calculate the angle for the end circle
        const angleEnd = Math.atan2(startY - endY, startX - endX);
        const endXAdjusted = endX + circleRadius * Math.cos(angleEnd);
        const endYAdjusted = endY + circleRadius * Math.sin(angleEnd);

        ctx.beginPath();
        ctx.moveTo(startXAdjusted, startYAdjusted);
        ctx.lineTo(endXAdjusted, endYAdjusted);
        ctx.stroke();
      }
    });

    // Then draw circles
    circles.forEach((circle) => {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circleRadius, 0, 2 * Math.PI);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = selectedCircle === circle.id ? 'teal' : 'black'; // Highlight selected circle
      ctx.lineWidth = selectedCircle === circle.id ? 3 : 1;
      if (paintedCircles.has(circle.id)) {
        ctx.strokeStyle = 'green'; // Paint perimeter green if painted
        ctx.lineWidth = 3;
      }
      ctx.stroke();
      ctx.lineWidth = 1;

      // Draw label
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '16px sans-serif';
      ctx.fillText(circle.text, circle.x, circle.y);
    });

    // Restore the transformation matrix
    ctx.restore();
  }, [circles, zoom, pan, selectedCircle, edges, circleRadius, potentialEdge, paintedCircles]);

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
      text: alphabet[circles.length % alphabet.length],
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
        canvas.style.cursor = 'grab';
      }
    } else if (tool === 'circle') {
      canvas.style.cursor = 'default';
    } else if (tool === 'delete') {
      if (clickedCircle) {
        setCircles(prevCircles => prevCircles.filter(c => c.id !== clickedCircle.id));
        setEdges(prevEdges => prevEdges.filter(e => e.start !== clickedCircle.id && e.end !== clickedCircle.id));
        setPaintedCircles(prevPaintedCircles => {
          const newPaintedCircles = new Set(prevPaintedCircles);
          newPaintedCircles.delete(clickedCircle.id);
          return newPaintedCircles;
        });
      } else {
        let clickedEdge: EdgeType | null = null;
        for (let i = edges.length - 1; i >= 0; i--) {
          const edge = edges[i];
          const startCircle = circles.find(c => c.id === edge.start);
          const endCircle = circles.find(c => c.id === edge.end);
          if (startCircle && endCircle) {
            const startX = startCircle.x;
            const startY = startCircle.y;
            const endX = endCircle.x;
            const endY = endCircle.y;

            const a = {x: (x - pan.x) / zoom, y:(y - pan.y) / zoom};
            const b = {x: startX, y: startY};
            const c = {x: endX, y: endY};

            const distance = pointToLineDistance(a, b, c);
            if (distance < 5) {
              clickedEdge = edge;
              break;
            }
          }
        }
        if (clickedEdge) {
          setEdges(prevEdges => prevEdges.filter(e => e.id !== clickedEdge.id));
        }
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
          setSelectedCircle(clickedCircle.id);
        }
      }
    } else if (tool === 'paint') {
      if (clickedCircle) {
        setPaintedCircles(prevPaintedCircles => {
          const newPaintedCircles = new Set(prevPaintedCircles);
          if (newPaintedCircles.has(clickedCircle.id)) {
            newPaintedCircles.delete(clickedCircle.id); // Unpaint if already painted
          } else {
            newPaintedCircles.add(clickedCircle.id); // Paint if not already painted
          }
          return newPaintedCircles;
        });
      }
    }
  };

  const pointToLineDistance = (point: { x: number, y: number }, lineStart: { x: number, y: number }, lineEnd: { x: number, y: number }): number => {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    if (dx === 0 && dy === 0) {
        // It's a point, treat as distance to lineStart
        return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
    }

    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx ** 2 + dy ** 2);

    // If t is outside the segment, find distance to closest endpoint
    if (t < 0) {
        return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
    }
    if (t > 1) {
        return Math.sqrt((point.x - lineEnd.x) ** 2 + (point.y - lineEnd.y) ** 2);
    }

    // Otherwise, get the closest point on the line segment and calculate distance
    const closestX = lineStart.x + t * dx;
    const closestY = lineStart.y + t * dy;

    return Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
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
  const isPaintActive = tool === 'paint';


  return (
    <div className="flex flex-col h-screen">
      <div className="bg-secondary p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* <Circle className="h-6 w-6 text-primary" /> */}
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
         <ArrowDownLeft className="h-4 w-4" />
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
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className={isPaintActive ? 'bg-accent text-accent-foreground' : ''}
          onClick={() => {
            setTool('paint');
            setSelectedCircle(null);
            setHoveredCircle(null);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="green"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-paint-bucket"
          >
            <path d="M3 6v14c0 .6.4 1 1 1h16c.6 0 1-.4 1-1V6c0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1Z" />
            <path d="M8 5a2 2 0 0 1 4 0c0 2-3 2-4 0" />
            <path d="M6 5H5c-.6 0-1 .4-1 1v4" />
            <path d="M18 5h1c.6 0 1 .4 1 1v4" />
          </svg>
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

