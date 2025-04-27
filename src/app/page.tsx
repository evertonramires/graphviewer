"use client";

import React, { useState, useRef, useEffect } from "react";
import { Hand, Plus, MousePointer, Trash2, ArrowDownLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

type ToolType = 'hand' | 'circle' | 'select' | 'edge' | 'delete' | 'paint' | 'edgeDashed';

interface NodeType {
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
  dashed: boolean;
}

const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

const alphabet = 'abcdefghijklmnopqrstuvwxyz';

export default function Home() {
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [edges, setEdges] = useState<EdgeType[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [potentialEdge, setPotentialEdge] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<ToolType>('circle');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isMiddleClicking, setIsMiddleClicking] = useState(false);
  const [selectedNodeCoords, setSelectedNodeCoords] = useState<{x:number|null, y:number|null}>({x:null, y:null});
  const [paintedNodes, setPaintedNodes] = useState<Set<string>>(new Set());
  const [paintedEdges, setPaintedEdges] = useState<Set<string>>(new Set());
  const [isEditingText, setIsEditingText] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');


  const nodeRadius = 25;

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
      const startNode = nodes.find(c => c.id === edge.start);
      const endNode = nodes.find(c => c.id === edge.end);

      if (startNode && endNode) {
        const startX = startNode.x;
        const startY = startNode.y;
        const endX = endNode.x;
        const endY = endNode.y;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        if (edge.dashed) {
          ctx.setLineDash([5, 5]); // Dashed line
        } else {
          ctx.setLineDash([]); // Solid line
        }
        if (paintedEdges.has(edge.id)) {
          ctx.strokeStyle = 'green'; // Paint edge green if painted
        } else {
          ctx.strokeStyle = 'black';
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
      }
    });

    // Then draw nodes
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = selectedNode === node.id ? 'teal' : 'black'; // Highlight selected node
      ctx.lineWidth = selectedNode === node.id ? 3 : 1;
      if (paintedNodes.has(node.id)) {
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
      ctx.fillText(node.text, node.x, node.y);
    });

    // Restore the transformation matrix
    ctx.restore();
  }, [nodes, zoom, pan, selectedNode, edges, nodeRadius, potentialEdge, paintedNodes, paintedEdges]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'circle') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const newNode = {
      id: generateId(),
      x: x,
      y: y,
      label: alphabet[nodes.length % alphabet.length],
      text: alphabet[nodes.length % alphabet.length],
    };
    setNodes(prevNodes => [...prevNodes, newNode]);
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

    let clickedNode: NodeType | null = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const distance = Math.sqrt(((x - pan.x) / zoom - node.x) ** 2 + ((y - pan.y) / zoom - node.y) ** 2);
      if (distance <= nodeRadius) {
        clickedNode = node;
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
      if (clickedNode) {
        setSelectedNode(clickedNode.id);
        setSelectedNodeCoords({x: clickedNode.x, y: clickedNode.y});
        setDragOffset({
          x: x - clickedNode.x * zoom - pan.x,
          y: y - clickedNode.y * zoom - pan.y,
        });
        canvas.style.cursor = 'grabbing';
      } else {
        canvas.style.cursor = 'grab';
      }
    } else if (tool === 'circle') {
      canvas.style.cursor = 'default';
    } else if (tool === 'delete') {
      if (clickedNode) {
        setNodes(prevNodes => prevNodes.filter(c => c.id !== clickedNode.id));
        setEdges(prevEdges => prevEdges.filter(e => e.start !== clickedNode.id && e.end !== clickedNode.id));
        setPaintedNodes(prevPaintedNodes => {
          const newPaintedNodes = new Set(prevPaintedNodes);
          newPaintedNodes.delete(clickedNode.id);
          return newPaintedNodes;
        });
        setPaintedEdges(prevPaintedEdges => {
          const newPaintedEdges = new Set(prevPaintedEdges);
          edges.filter(e => e.start === clickedNode.id || e.end === clickedNode.id).forEach(edge => {
            newPaintedEdges.delete(edge.id);
          });
          return newPaintedEdges;
        });
      } else {
        let clickedEdge: EdgeType | null = null;
        for (let i = edges.length - 1; i >= 0; i--) {
          const edge = edges[i];
          const startNode = nodes.find(c => c.id === edge.start);
          const endNode = nodes.find(c => c.id === edge.end);
          if (startNode && endNode) {
            const startX = startNode.x;
            const startY = startNode.y;
            const endX = endNode.x;
            const endY = endNode.y;

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
          setPaintedEdges(prevPaintedEdges => {
            const newPaintedEdges = new Set(prevPaintedEdges);
            newPaintedEdges.delete(clickedEdge.id);
            return newPaintedEdges;
          });
        }
      }
    } else if (tool === 'edge' || tool === 'edgeDashed') {
      if (clickedNode) {
        if (potentialEdge) {
          // Create edge
          const newEdge = { id: generateId(), start: potentialEdge, end: clickedNode.id, dashed: tool === 'edgeDashed' };
          setEdges(prevEdges => [...prevEdges, newEdge]);
          setPotentialEdge(null);
          setTool('select');
        } else {
          // Start edge
          setPotentialEdge(clickedNode.id);
          setSelectedNode(clickedNode.id);
        }
      }
    } else if (tool === 'paint') {
      if (clickedNode) {
        setPaintedNodes(prevPaintedNodes => {
          const newPaintedNodes = new Set(prevPaintedNodes);
          if (newPaintedNodes.has(clickedNode.id)) {
            newPaintedNodes.delete(clickedNode.id); // Unpaint if already painted
          } else {
            newPaintedNodes.add(clickedNode.id); // Paint if not already painted
          }
          return newPaintedNodes;
        });
      } else {
        let clickedEdge: EdgeType | null = null;
        for (let i = edges.length - 1; i >= 0; i--) {
          const edge = edges[i];
          const startNode = nodes.find(c => c.id === edge.start);
          const endNode = nodes.find(c => c.id === edge.end);
          if (startNode && endNode) {
            const startX = startNode.x;
            const startY = startNode.y;
            const endX = endNode.x;
            const endY = endNode.y;

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
          setPaintedEdges(prevPaintedEdges => {
            const newPaintedEdges = new Set(prevPaintedEdges);
            if (newPaintedEdges.has(clickedEdge.id)) {
              newPaintedEdges.delete(clickedEdge.id); // Unpaint if already painted
            } else {
              newPaintedEdges.add(clickedEdge.id); // Paint if not already painted
            }
            return newPaintedEdges;
          });
        }
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
    } else if (tool === 'select' && selectedNode) {
      setNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === selectedNode
            ? {
              ...node,
              x: (x - dragOffset.x) / zoom,
              y: (y - dragOffset.y) / zoom,
            }
            : node
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
      canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
    } else if (tool === 'edge' || tool === 'edgeDashed') {
      canvas.style.cursor = potentialEdge ? 'crosshair' : hoveredNode ? 'pointer' : 'grab';
    }
    else {
      canvas.style.cursor = tool === 'hand' ? 'grab' : 'default';
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (tool === 'select' || tool === 'edge' || tool === 'edgeDashed') {
      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let isOverNode = false;
        for (let i = nodes.length - 1; i >= 0; i--) {
          const node = nodes[i];
          const distance = Math.sqrt(((x - pan.x) / zoom - node.x) ** 2 + ((y - pan.y) / zoom - node.y) ** 2);
          if (distance <= nodeRadius) {
            isOverNode = true;
            setHoveredNode(node.id);
            canvas.style.cursor = 'pointer';
            break;
          }
        }
        if (!isOverNode) {
          setHoveredNode(null);
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
  }, [tool, nodes, pan, zoom, potentialEdge]);

  const isHandActive = tool === 'hand';
  const isCircleActive = tool === 'circle';
  const isSelectActive = tool === 'select';
  const isEdgeActive = tool === 'edge';
  const isEdgeDashedActive = tool === 'edgeDashed';
  const isDeleteActive = tool === 'delete';
  const isPaintActive = tool === 'paint';


  return (
    <div className="flex flex-col h-screen">
      <div className="bg-secondary p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* <Circle className="h-6 w-6 text-primary" /> */}
          <h1 className="text-lg font-semibold">Graph Viewer</h1>
        </div>
      </div>
      <div className="bg-secondary p-4 flex items-center justify-start gap-2">
        <Button
          variant="outline"
          className={isHandActive ? 'bg-accent text-accent-foreground' : ''}
          onClick={() => {
            setTool('hand');
            setSelectedNode(null);
            setHoveredNode(null);
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
            setSelectedNode(null);
            setHoveredNode(null);
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
            setSelectedNode(null);
            setHoveredNode(null);
          }}
        >
          <MousePointer className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className={isEdgeActive ? 'bg-accent text-accent-foreground' : ''}
          onClick={() => {
            setTool('edge');
            setSelectedNode(null);
            setHoveredNode(null);
          }}
        >
         <ArrowDownLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className={isEdgeDashedActive ? 'bg-accent text-accent-foreground' : ''}
          onClick={() => {
            setTool('edgeDashed');
            setSelectedNode(null);
            setHoveredNode(null);
          }}
        >
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-line-dashed"><path d="M2 3h20"/><path d="M6 12h2"/><path d="M14 12h2"/><path d="M2 21h20"/></svg>
        </Button>
        <Button
          variant="outline"
          className={isDeleteActive ? 'bg-accent text-accent-foreground' : ''}
          onClick={() => {
            setTool('delete');
            setSelectedNode(null);
            setHoveredNode(null);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className={isPaintActive ? 'bg-accent text-accent-foreground' : ''}
          onClick={() => {
            setTool('paint');
            setSelectedNode(null);
            setHoveredNode(null);
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
          Nodes: {nodes.length} Edges: {edges.length}
        </div>
        <div>
          {selectedNode && (
            <span>
              Selected Node: ({selectedNodeCoords.x}, {selectedNodeCoords.y})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

