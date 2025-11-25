"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ZoomableCanvasProps {
  imageUrl: string;
}

export function ZoomableCanvas({ imageUrl }: ZoomableCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const minScale = 0.5;
  const maxScale = 5;
  const scaleStep = 0.1;

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
    // Center the image on load
    if (containerRef.current && imageRef.current) {
      const container = containerRef.current;
      const img = imageRef.current;
      const centerX = (container.clientWidth - img.naturalWidth) / 2;
      const centerY = (container.clientHeight - img.naturalHeight) / 2;
      setPosition({ x: centerX, y: centerY });
      setScale(1);
    }
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
  }, []);

  // Zoom functions
  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + scaleStep, maxScale));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - scaleStep, minScale));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    if (containerRef.current && imageRef.current) {
      const container = containerRef.current;
      const img = imageRef.current;
      const centerX = (container.clientWidth - img.naturalWidth * scale) / 2;
      const centerY = (container.clientHeight - img.naturalHeight * scale) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, [scale]);

  const fitToScreen = useCallback(() => {
    if (containerRef.current && imageRef.current) {
      const container = containerRef.current;
      const img = imageRef.current;
      const containerAspect = container.clientWidth / container.clientHeight;
      const imageAspect = img.naturalWidth / img.naturalHeight;

      let newScale: number;
      if (containerAspect > imageAspect) {
        // Container is wider, fit to height
        newScale = container.clientHeight / img.naturalHeight;
      } else {
        // Container is taller, fit to width
        newScale = container.clientWidth / img.naturalWidth;
      }

      // Add some padding (90% of fit)
      newScale = newScale * 0.9;

      setScale(newScale);
      const centerX = (container.clientWidth - img.naturalWidth * newScale) / 2;
      const centerY = (container.clientHeight - img.naturalHeight * newScale) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
      const newScale = Math.max(minScale, Math.min(maxScale, scale + delta));

      if (containerRef.current && imageRef.current) {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate zoom point relative to image
        const imageX = (mouseX - position.x) / scale;
        const imageY = (mouseY - position.y) / scale;

        // Calculate new position to keep zoom point under cursor
        const newX = mouseX - imageX * newScale;
        const newY = mouseY - imageY * newScale;

        setScale(newScale);
        setPosition({ x: newX, y: newY });
      }
    },
    [scale, position]
  );

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle slider change
  const handleSliderChange = useCallback((value: number[]) => {
    const newScale = value[0] / 100;
    setScale(newScale);
  }, []);

  // Constrain position when scale changes
  useEffect(() => {
    if (containerRef.current && imageRef.current) {
      const container = containerRef.current;
      const img = imageRef.current;
      const maxX = 0;
      const maxY = 0;
      const minX = container.clientWidth - img.naturalWidth * scale;
      const minY = container.clientHeight - img.naturalHeight * scale;

      setPosition((prev) => ({
        x: Math.max(minX, Math.min(maxX, prev.x)),
        y: Math.max(minY, Math.min(maxY, prev.y)),
      }));
    }
  }, [scale]);

  // Touch handlers for mobile
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; distance: number } | null>(
    null
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 1) {
        // Single touch - start panning
        const touch = e.touches[0];
        setTouchStart({
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
          distance: 0,
        });
      } else if (e.touches.length === 2) {
        // Two touches - pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        setTouchStart({
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
          distance,
        });
      }
    },
    [position]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!touchStart) return;

      if (e.touches.length === 1 && touchStart.distance === 0) {
        // Single touch panning
        const touch = e.touches[0];
        setPosition({
          x: touch.clientX - touchStart.x,
          y: touch.clientY - touchStart.y,
        });
      } else if (e.touches.length === 2) {
        // Pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const scaleChange = distance / touchStart.distance;
        const newScale = Math.max(minScale, Math.min(maxScale, scale * scaleChange));
        setScale(newScale);
      }
    },
    [touchStart, scale]
  );

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-12rem)] bg-muted/50">
      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden relative cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image */}
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">Organization chart image not found</p>
              <p className="text-sm text-muted-foreground">
                Please add an organization chart image at <code>/public/organization-chart.png</code>
              </p>
            </div>
          </div>
        ) : (
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Organization Chart"
            className={cn(
              "absolute select-none",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "top left",
              transition: isDragging || touchStart ? "none" : "transform 0.1s ease-out",
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            draggable={false}
          />
        )}

        {/* Loading overlay */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-muted-foreground">Loading organization chart...</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
        <Button
          variant="outline"
          size="icon"
          onClick={zoomOut}
          disabled={scale <= minScale}
          className="h-8 w-8"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <div className="w-32">
          <Slider
            value={[scale * 100]}
            min={minScale * 100}
            max={maxScale * 100}
            step={scaleStep * 100}
            onValueChange={handleSliderChange}
            className="w-full"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={zoomIn}
          disabled={scale >= maxScale}
          className="h-8 w-8"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        <Button
          variant="outline"
          size="icon"
          onClick={fitToScreen}
          className="h-8 w-8"
          title="Fit to screen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={resetZoom}
          className="h-8 w-8"
          title="Reset zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-1.5 text-sm font-medium">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

