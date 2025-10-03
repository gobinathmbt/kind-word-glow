import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  title?: string;
  description?: string;
}

interface MediaViewerProps {
  media: MediaItem[];
  currentMediaId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const MediaViewer: React.FC<MediaViewerProps> = ({
  media,
  currentMediaId,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Set current index when currentMediaId changes
  useEffect(() => {
    if (currentMediaId && media.length > 0) {
      const index = media.findIndex(item => item.id === currentMediaId);
      if (index !== -1) {
        setCurrentIndex(index);
        resetTransformations();
      }
    }
  }, [currentMediaId, media]);

  // Reset transformations and loading state when media changes
  useEffect(() => {
    resetTransformations();
    setIsLoading(true);
    setHasError(false);
  }, [currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0") {
        resetTransformations();
      } else if (e.key === "r" || e.key === "R") {
        handleRotate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, media.length]);

  const resetTransformations = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev === media.length - 1 ? 0 : prev + 1));
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMediaLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleMediaError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentMedia.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentMedia.title || `media-${currentMedia.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (!isOpen || media.length === 0) return null;

  const currentMedia = media[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred background overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-lg"
        onClick={onClose}
      />
      
      {/* Close button */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-6 right-6 z-20 bg-white/90 hover:bg-white text-gray-900 shadow-lg backdrop-blur-sm border border-white/20 transition-all duration-200 hover:scale-110"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Navigation arrows */}
      {media.length > 1 && (
        <>
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-6 z-20 bg-white/90 hover:bg-white text-gray-900 shadow-lg backdrop-blur-sm border border-white/20 transition-all duration-200 hover:scale-110"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-6 z-20 bg-white/90 hover:bg-white text-gray-900 shadow-lg backdrop-blur-sm border border-white/20 transition-all duration-200 hover:scale-110"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-700 mx-auto mb-4" />
            <p className="text-gray-700 text-sm font-medium">Loading media...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20 text-center">
            <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">Failed to load media</h3>
            <p className="text-gray-600 text-sm">The media file could not be loaded.</p>
          </div>
        </div>
      )}

      {/* Media container */}
      <div className="relative w-full h-full flex items-center justify-center p-8 z-10">
        <div
          className={`relative max-w-full max-h-full overflow-hidden rounded-2xl shadow-2xl transition-opacity duration-300 ${
            isLoading || hasError ? 'opacity-0' : 'opacity-100'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
        >
          {currentMedia.type === "image" ? (
            <img
              src={currentMedia.url}
              alt={currentMedia.title || `Image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onLoad={handleMediaLoad}
              onError={handleMediaError}
              draggable={false}
            />
          ) : (
            <video
              src={currentMedia.url}
              controls
              autoPlay
              muted
              className="max-w-full max-h-full object-contain rounded-xl"
              onLoadedData={handleMediaLoad}
              onError={handleMediaError}
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          )}
        </div>
      </div>

      {/* Controls toolbar */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 p-3 bg-white/90 rounded-2xl backdrop-blur-sm shadow-2xl border border-white/20 z-20">
        <Button
          variant="secondary"
          size="icon"
          className="bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-all duration-200 hover:scale-110 border-0"
          onClick={handleZoomIn}
          disabled={scale >= 5}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button
          variant="secondary"
          size="icon"
          className="bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-all duration-200 hover:scale-110 border-0"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        {currentMedia.type === "image" && (
          <Button
            variant="secondary"
            size="icon"
            className="bg-green-500 hover:bg-green-600 text-white shadow-md transition-all duration-200 hover:scale-110 border-0"
            onClick={handleRotate}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        )}
        
        {/* <Button
          variant="secondary"
          size="icon"
          className="bg-purple-500 hover:bg-purple-600 text-white shadow-md transition-all duration-200 hover:scale-110 border-0"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4" />
        </Button> */}

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          variant="secondary"
          size="sm"
          className="bg-gray-500 hover:bg-gray-600 text-white shadow-md transition-all duration-200 hover:scale-105 border-0 text-xs px-3"
          onClick={resetTransformations}
          disabled={scale === 1 && rotation === 0 && position.x === 0 && position.y === 0}
        >
          Reset
        </Button>
      </div>

      {/* Media counter */}
      {media.length > 1 && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-gray-900 text-sm font-semibold bg-white/90 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm border border-white/20 z-20">
          {currentIndex + 1} of {media.length}
        </div>
      )}

      {/* Media info */}
      {(currentMedia.title || currentMedia.description) && (
        <div className="absolute bottom-6 left-6 max-w-md bg-white/90 p-4 rounded-2xl shadow-2xl backdrop-blur-sm border border-white/20 z-20">
          {currentMedia.title && (
            <h3 className="font-bold text-gray-900 text-lg mb-1">{currentMedia.title}</h3>
          )}
          {currentMedia.description && (
            <p className="text-gray-700 text-sm leading-relaxed">{currentMedia.description}</p>
          )}
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="absolute top-6 right-20 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/20 z-20 max-w-xs">
        <div className="text-xs text-gray-700 space-y-1">
          <div className="flex justify-between">
            <span>Navigate:</span>
            <span className="font-mono">← →</span>
          </div>
          <div className="flex justify-between">
            <span>Zoom:</span>
            <span className="font-mono">+ - 0</span>
          </div>
          <div className="flex justify-between">
            <span>Rotate:</span>
            <span className="font-mono">R</span>
          </div>
          <div className="flex justify-between">
            <span>Close:</span>
            <span className="font-mono">ESC</span>
          </div>
        </div>
      </div>
    </div>
  );
};


export default MediaViewer;