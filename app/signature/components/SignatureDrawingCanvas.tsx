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
  const smoothingFactorRef = useRef(0.5);
  const isDrawingRef = useRef(false);

  // Redraw canvas with current points
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Store the current transformation matrix
      ctx.save();
      
      // Clear canvas
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

      // Draw all points
      if (points.length > 1) {
        let currentStroke = points[0].strokeId;
        ctx.beginPath();

        for (let i = 1; i < points.length; i++) {
          const p1 = points[i - 1];
          const p2 = points[i];
          
          if (p2.strokeId !== currentStroke) {
            ctx.stroke();
            ctx.beginPath();
            currentStroke = p2.strokeId;
            continue;
          }
          
          const velocity = calculateVelocity(p1, p2);
          const velocityFactor = Math.max(0.2, 1 - velocity * 0.05);
          const pressureFactor = (p1.pressure + p2.pressure) / 2;
          const dynamicLineWidth = lineWidth * pressureFactor * velocityFactor;
          
          ctx.lineWidth = dynamicLineWidth;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);

          if (i < points.length - 1 && points[i + 1].strokeId === currentStroke) {
            const p3 = points[i + 1];
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

      // Restore the transformation matrix
      ctx.restore();

      // Update signature data if needed
      if (onChange && points.length > 0) {
        onChange(canvas.toDataURL());
      }
    } catch (error) {
      console.error('Error drawing on canvas:', error);
    }
  }, [points, lineColor, lineWidth, onChange]);

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

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    try {
      e.preventDefault();
      if (!isDrawingRef.current || !lastPoint) return;

      const point = getPointFromEvent(e.nativeEvent);
      if (!point) return;

      point.velocity = calculateVelocity(lastPoint, point);

      const interpolatedPoints: Point[] = [];
      const steps = 5;
      
      for (let i = 1; i <= steps; i++) {
        interpolatedPoints.push(getSmoothPoint(lastPoint, point, i / steps));
      }

      setPoints(prev => [...prev, ...interpolatedPoints]);
      setLastPoint(point);
    } catch (error) {
      console.error('Error during drawing:', error);
    }
  }, [lastPoint]);

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