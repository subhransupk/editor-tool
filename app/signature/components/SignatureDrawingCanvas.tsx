'use client';

import { useEffect, useRef, useState } from 'react';

interface Point {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
  velocity?: number;
  strokeId: number;
}

interface TouchWithForce extends Touch {
  force: number;
}

interface SignatureDrawingCanvasProps {
  onChange?: (signatureData: string) => void;
  width?: number;
  height?: number;
  lineColor?: string;
  lineWidth?: number;
}

export default function SignatureDrawingCanvas({
  onChange,
  width = 800,
  height = 200,
  lineColor = '#000000',
  lineWidth = 2,
}: SignatureDrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const currentStrokeId = useRef(0);
  
  // Move smoothingFactor outside useEffect dependencies
  const smoothingFactorRef = useRef(0.5);

  // Calculate velocity between two points
  const calculateVelocity = (p1: Point, p2: Point): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const timeDiff = p2.timestamp - p1.timestamp;
    return distance / (timeDiff || 1);
  };

  // Get smoothed point between two points
  const getSmoothPoint = (p1: Point, p2: Point, factor: number): Point => {
    return {
      x: p1.x + (p2.x - p1.x) * factor,
      y: p1.y + (p2.y - p1.y) * factor,
      pressure: p1.pressure + (p2.pressure - p1.pressure) * factor,
      timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * factor,
      strokeId: p1.strokeId,
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas properties
    ctx.strokeStyle = lineColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all points with pressure and velocity sensitivity
    if (points.length > 1) {
      let currentStroke = points[0].strokeId;
      ctx.beginPath();

      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        
        // Start a new path if stroke ID changes
        if (p2.strokeId !== currentStroke) {
          ctx.stroke();
          ctx.beginPath();
          currentStroke = p2.strokeId;
          continue;
        }
        
        // Calculate velocity-based line width
        const velocity = calculateVelocity(p1, p2);
        const velocityFactor = Math.max(0.2, 1 - velocity * 0.05);
        
        // Calculate pressure-based line width
        const pressureFactor = (p1.pressure + p2.pressure) / 2;
        
        // Combined line width based on base width, pressure, and velocity
        const dynamicLineWidth = lineWidth * pressureFactor * velocityFactor;
        
        // Draw segment with varying width
        ctx.beginPath();
        ctx.lineWidth = dynamicLineWidth;
        ctx.moveTo(p1.x, p1.y);

        // Create smooth curve between points
        if (i < points.length - 1 && points[i + 1].strokeId === currentStroke) {
          const p3 = points[i + 1];
          
          // Calculate control points for smoother curve
          const controlPoint1 = getSmoothPoint(p1, p2, smoothingFactorRef.current);
          const controlPoint2 = getSmoothPoint(p3, p2, smoothingFactorRef.current);
          
          ctx.bezierCurveTo(
            controlPoint1.x, controlPoint1.y,
            controlPoint2.x, controlPoint2.y,
            p2.x, p2.y
          );
        } else {
          ctx.lineTo(p2.x, p2.y);
        }
        
        ctx.stroke();
      }
    }
  }, [points, lineColor, lineWidth]);

  const getPointFromEvent = (e: MouseEvent | TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
    
    // Get pressure from touch/pointer events if available
    let pressure = 1;
    if ('pressure' in e) {
      pressure = (e as PointerEvent).pressure || 0.5;
    } else if ('touches' in e && e.touches[0] && 'force' in e.touches[0]) {
      pressure = ((e.touches[0] as TouchWithForce).force) || 0.5;
    }
    
    return {
      x,
      y,
      pressure: pressure * 1.5, // Amplify pressure effect
      timestamp: Date.now(),
      strokeId: currentStrokeId.current,
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    currentStrokeId.current += 1; // Increment stroke ID for new stroke
    const point = getPointFromEvent(e.nativeEvent);
    if (!point) return;

    setIsDrawing(true);
    setLastPoint(point);
    setPoints(prev => [...prev, point]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPoint) return;

    const point = getPointFromEvent(e.nativeEvent);
    if (!point) return;

    // Calculate velocity
    point.velocity = calculateVelocity(lastPoint, point);

    // Add points with interpolation for smoother curves
    const interpolatedPoints: Point[] = [];
    const steps = 5; // Number of interpolation steps
    
    for (let i = 1; i <= steps; i++) {
      interpolatedPoints.push(getSmoothPoint(lastPoint, point, i / steps));
    }

    setPoints(prev => [...prev, ...interpolatedPoints]);
    setLastPoint(point);
  };

  const handleEnd = () => {
    setIsDrawing(false);
    setLastPoint(null);

    // Notify parent component of the signature data
    if (canvasRef.current && onChange) {
      onChange(canvasRef.current.toDataURL());
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPoints([]);
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded-lg touch-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        style={{
          cursor: 'crosshair',
          touchAction: 'none', // Prevent scrolling while drawing
        }}
      />
      <button
        onClick={handleClear}
        className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
      >
        Clear
      </button>
      <div className="absolute bottom-2 left-2 text-gray-400 text-sm">
        Draw your signature here
      </div>
    </div>
  );
} 