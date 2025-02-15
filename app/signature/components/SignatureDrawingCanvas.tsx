'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
  lineColor?: string;
  lineWidth?: number;
}

export default function SignatureDrawingCanvas({
  onChange,
  lineColor = '#000000',
  lineWidth = 2,
}: SignatureDrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const currentStrokeId = useRef(0);
  const smoothingFactorRef = useRef(0.85);
  const isDrawingRef = useRef(false);
  const pathBuffer = useRef<Point[]>([]);

  // Calculate velocity between two points
  const calculateVelocity = useCallback((p1: Point, p2: Point): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const timeDiff = p2.timestamp - p1.timestamp;
    return distance / (timeDiff || 1);
  }, []);

  // Enhanced draw stroke function
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, points: Point[], baseWidth: number) => {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Enhanced curve drawing
    for (let i = 1; i < points.length - 2; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const velocity = calculateVelocity(p1, p2);
      const velocityFactor = Math.max(0.3, 1 - velocity * 0.02); // Adjusted velocity impact
      const pressureFactor = (p1.pressure + p2.pressure) / 2;
      
      // Smoother line width transitions
      ctx.lineWidth = baseWidth * pressureFactor * velocityFactor;

      // Use quadratic curves for smoother connections
      const xc = (p1.x + p2.x) / 2;
      const yc = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, xc, yc);
    }

    // Handle the last two points
    if (points.length >= 2) {
      const last = points[points.length - 1];
      const secondLast = points[points.length - 2];
      ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
    }

    ctx.stroke();
  }, [calculateVelocity]);

  // Enhanced path optimization
  const optimizePath = useCallback((points: Point[]): Point[] => {
    if (points.length < 3) return points;

    const result: Point[] = [points[0]];
    let prevPoint = points[0];
    let currentPoint = points[1];

    for (let i = 2; i < points.length; i++) {
      const nextPoint = points[i];
      
      // Calculate angles between points
      const angle1 = Math.atan2(currentPoint.y - prevPoint.y, currentPoint.x - prevPoint.x);
      const angle2 = Math.atan2(nextPoint.y - currentPoint.y, nextPoint.x - currentPoint.x);
      
      // Calculate distance between points
      const distance = Math.sqrt(
        Math.pow(nextPoint.x - prevPoint.x, 2) + 
        Math.pow(nextPoint.y - prevPoint.y, 2)
      );

      // Only keep points that represent significant direction changes or are far apart
      if (Math.abs(angle1 - angle2) > 0.1 || distance > 10) {
        result.push(currentPoint);
        prevPoint = currentPoint;
      }
      
      currentPoint = nextPoint;
    }

    result.push(points[points.length - 1]);
    return result;
  }, []);

  // Enhanced smoothing function using advanced Bezier curves
  const smoothPoints = useCallback((points: Point[]): Point[] => {
    if (points.length < 3) return points;

    // First optimize the path
    const optimizedPoints = optimizePath(points);
    if (optimizedPoints.length < 3) return optimizedPoints;

    const smoothed: Point[] = [];
    smoothed.push(optimizedPoints[0]);

    for (let i = 1; i < optimizedPoints.length - 1; i++) {
      const prev = optimizedPoints[i - 1];
      const current = optimizedPoints[i];
      const next = optimizedPoints[i + 1];

      // Calculate improved control points
      const controlPoint1 = {
        x: current.x + (prev.x - current.x) * smoothingFactorRef.current,
        y: current.y + (prev.y - current.y) * smoothingFactorRef.current,
        pressure: current.pressure,
        timestamp: current.timestamp,
        strokeId: current.strokeId
      };

      const controlPoint2 = {
        x: current.x + (next.x - current.x) * smoothingFactorRef.current,
        y: current.y + (next.y - current.y) * smoothingFactorRef.current,
        pressure: current.pressure,
        timestamp: current.timestamp,
        strokeId: current.strokeId
      };

      // Add more interpolated points for smoother curves
      const steps = 8; // Increased steps for smoother curves
      for (let t = 0; t < 1; t += 1/steps) {
        const point = {
          x: Math.pow(1-t, 3) * prev.x + 
             3 * Math.pow(1-t, 2) * t * controlPoint1.x + 
             3 * (1-t) * Math.pow(t, 2) * controlPoint2.x + 
             Math.pow(t, 3) * next.x,
          y: Math.pow(1-t, 3) * prev.y + 
             3 * Math.pow(1-t, 2) * t * controlPoint1.y + 
             3 * (1-t) * Math.pow(t, 2) * controlPoint2.y + 
             Math.pow(t, 3) * next.y,
          pressure: current.pressure * (1 - Math.abs(0.5 - t) * 0.5), // Smooth pressure transition
          timestamp: current.timestamp,
          strokeId: current.strokeId
        };
        smoothed.push(point);
      }
    }

    smoothed.push(optimizedPoints[optimizedPoints.length - 1]);
    return smoothed;
  }, [optimizePath]);

  // Enhanced redraw function
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set canvas properties
      ctx.strokeStyle = lineColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Scale the context to match the canvas size
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      ctx.scale(scaleX, scaleY);

      // Draw all points with enhanced smoothing
      if (points.length > 1) {
        let currentStroke = points[0].strokeId;
        let strokePoints: Point[] = [];

        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          
          if (point.strokeId !== currentStroke) {
            // Process and draw current stroke
            const smoothedPoints = smoothPoints(strokePoints);
            drawStroke(ctx, smoothedPoints, lineWidth);
            
            // Start new stroke
            currentStroke = point.strokeId;
            strokePoints = [point];
          } else {
            strokePoints.push(point);
          }
        }

        // Draw last stroke
        if (strokePoints.length > 0) {
          const smoothedPoints = smoothPoints(strokePoints);
          drawStroke(ctx, smoothedPoints, lineWidth);
        }
      }

      ctx.restore();

      if (onChange && points.length > 0) {
        onChange(canvas.toDataURL());
      }
    } catch (error) {
      console.error('Error drawing on canvas:', error);
    }
  }, [points, lineColor, lineWidth, onChange, drawStroke, smoothPoints]);

  // Enhanced handle move function with path buffering
  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    try {
      e.preventDefault();
      if (!isDrawingRef.current || !lastPoint) return;

      const point = getPointFromEvent(e.nativeEvent);
      if (!point) return;

      point.velocity = calculateVelocity(lastPoint, point);

      // Add to path buffer
      pathBuffer.current.push(point);
      
      // Keep a larger buffer for better curve fitting
      if (pathBuffer.current.length > 12) {
        pathBuffer.current.shift();
      }

      // Apply enhanced smoothing to the buffered path
      const smoothedPoints = smoothPoints(pathBuffer.current);
      
      if (smoothedPoints.length > 0) {
        // Only add the last few smoothed points to avoid lag
        const newPoints = smoothedPoints.slice(-3);
        setPoints(prev => [...prev, ...newPoints]);
        setLastPoint(smoothedPoints[smoothedPoints.length - 1]);
      }
    } catch (error) {
      console.error('Error during drawing:', error);
    }
  }, [lastPoint, smoothPoints, calculateVelocity]);

  // Debounced resize handler to prevent ResizeObserver loop
  const debouncedResize = useCallback((entries: ResizeObserverEntry[]) => {
    if (!entries.length) return;
    
    const entry = entries[0];
    requestAnimationFrame(() => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;

        canvas.width = width;
        canvas.height = height;
        redrawCanvas();
      } catch (error) {
        console.error('Error in resize handler:', error);
      }
    });
  }, [redrawCanvas]);

  // Update canvas size and redraw when container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number;
    let resizeObserver: ResizeObserver | null = null;

    try {
      resizeObserver = new ResizeObserver((entries) => {
        // Cancel any pending rAF
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        // Schedule new resize handling
        rafId = requestAnimationFrame(() => debouncedResize(entries));
      });

      resizeObserver.observe(container);

      // Initial size update
      debouncedResize([{ 
        contentRect: container.getBoundingClientRect() 
      } as ResizeObserverEntry]);

    } catch (error) {
      console.error('Error setting up ResizeObserver:', error);
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [debouncedResize]);

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

  // Handle drawing events
  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    try {
      e.preventDefault();
      currentStrokeId.current += 1;
      const point = getPointFromEvent(e.nativeEvent);
      if (!point) return;

      isDrawingRef.current = true;
      setLastPoint(point);
      setPoints(prev => [...prev, point]);
    } catch (error) {
      console.error('Error starting drawing:', error);
    }
  }, []);

  const handleEnd = useCallback(() => {
    try {
      isDrawingRef.current = false;
      setLastPoint(null);

      const canvas = canvasRef.current;
      if (canvas && onChange) {
        onChange(canvas.toDataURL());
      }
    } catch (error) {
      console.error('Error ending drawing:', error);
    }
  }, [onChange]);

  // Handle full screen mode
  const toggleFullScreen = useCallback(() => {
    try {
      setIsFullScreen(prev => !prev);
      // Only clear points when entering full screen, not when exiting
      if (!isFullScreen) {
        setPoints([]);
        setLastPoint(null);
        if (onChange) {
          onChange('');
        }
      } else {
        // When exiting full screen, update the signature data
        const canvas = canvasRef.current;
        if (canvas && onChange && points.length > 0) {
          onChange(canvas.toDataURL());
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  }, [onChange, isFullScreen, points.length]);

  // Handle canvas clear
  const handleClear = useCallback(() => {
    try {
      setPoints([]);
      setLastPoint(null);
      if (onChange) {
        onChange('');
      }
    } catch (error) {
      console.error('Error clearing canvas:', error);
    }
  }, [onChange]);

  return (
    <>
      <div 
        ref={containerRef} 
        className={`relative ${
          isFullScreen 
            ? 'fixed inset-0 z-50 bg-white p-4' 
            : 'w-full h-full'
        }`}
        style={{ contain: 'content' }}
      >
        <canvas
          ref={canvasRef}
          className={`w-full h-full border border-gray-300 rounded-lg touch-none ${
            isFullScreen ? 'max-h-[calc(100vh-120px)]' : ''
          }`}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          style={{
            cursor: 'crosshair',
            touchAction: 'none',
            contain: 'size layout paint',
            willChange: 'transform' // Add will-change for better performance
          }}
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={toggleFullScreen}
            className="px-2 py-1 lg:px-3 lg:py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs lg:text-sm flex items-center gap-1"
          >
            {isFullScreen ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
                Full Screen
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            className="px-2 py-1 lg:px-3 lg:py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs lg:text-sm flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>
        </div>
        {isFullScreen && (
          <button
            onClick={toggleFullScreen}
            className="absolute bottom-4 right-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm lg:text-base"
          >
            Done
          </button>
        )}
        <div className="absolute bottom-2 left-2 text-gray-400 text-xs lg:text-sm">
          {isFullScreen ? 'Draw your signature in full screen mode' : 'Draw your signature here'}
        </div>
      </div>
      {isFullScreen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={toggleFullScreen}
          onTouchEnd={(e) => {
            e.preventDefault();
            toggleFullScreen();
          }}
          style={{ contain: 'strict' }}
        />
      )}
    </>
  );
} 