'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Spin, Result, Alert, Progress, Button, Tooltip } from 'antd';
import { 
  RotateLeftOutlined, 
  DragOutlined, 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  FullscreenExitOutlined 
} from '@ant-design/icons';

interface ThreeSixtyViewerProps {
  codigo: string;
  marca: string;
}

export default function ThreeSixtyViewer({ codigo, marca }: ThreeSixtyViewerProps) {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preloading, setPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Zoom state (Pan is disabled, zoom remains centered)
  const [zoom, setZoom] = useState(1);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startFrameIndex = useRef(0);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Speed of rotation: number of pixels dragged to change 1 frame
  const PX_PER_FRAME = 8;

  useEffect(() => {
    let active = true;

    async function fetchImages() {
      try {
        setLoading(true);
        setError(null);
        setCurrentIndex(0);
        setZoom(1);

        const response = await fetch(`/api/products/${codigo}/images?marca=${marca}`);
        const result = await response.json();

        if (!active) return;

        if (result.success) {
          const list = result.data || [];
          setImages(list);

          if (list.length > 0) {
            // Start preloading images
            setPreloading(true);
            setPreloadProgress(0);
            let loadedCount = 0;

            list.forEach((src: string) => {
              const img = new Image();
              img.src = src;
              img.onload = () => {
                if (!active) return;
                loadedCount++;
                const progress = Math.round((loadedCount / list.length) * 100);
                setPreloadProgress(progress);
                if (loadedCount === list.length) {
                  setPreloading(false);
                }
              };
              img.onerror = () => {
                if (!active) return;
                loadedCount++;
                const progress = Math.round((loadedCount / list.length) * 100);
                setPreloadProgress(progress);
                if (loadedCount === list.length) {
                  setPreloading(false);
                }
              };
            });
          }
        } else {
          setError(result.error || 'No se pudieron cargar las imágenes');
        }
      } catch (err) {
        console.error('Error fetching images:', err);
        if (active) {
          setError('Error de conexión al cargar las imágenes');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchImages();

    return () => {
      active = false;
    };
  }, [codigo, marca]);

  // Hook up non-passive wheel event listener on container to prevent browser zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container || images.length === 0) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Stop default browser zoom
      
      const sensitivity = 1;
      const delta = -e.deltaY;
      
      setZoom(prevZoom => {
        return Math.min(Math.max(prevZoom + delta * sensitivity, 1), 4);
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [images, preloading]);

  // Pointer event handlers - Always rotates the product, even when zoomed
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (images.length === 0) return;
    
    isDragging.current = true;
    startX.current = e.clientX;
    startFrameIndex.current = currentIndex;
    
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || images.length === 0) return;

    const diffX = e.clientX - startX.current;
    const frameDelta = Math.floor(diffX / PX_PER_FRAME);
    
    // Subtract to rotate in drag direction
    const newIndex = (startFrameIndex.current - frameDelta + images.length * 10) % images.length;
    setCurrentIndex(newIndex);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      isDragging.current = false;
      if (containerRef.current) {
        containerRef.current.releasePointerCapture(e.pointerId);
      }
    }
  };

  // Zoom Button Handlers
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 1));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 md:h-[calc(90vh-160px)] aspect-square bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 mx-auto">
        <Spin size="large" />
        <span className="mt-4 text-sm text-zinc-500">Cargando fotogramas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80 md:h-[calc(90vh-160px)] aspect-square bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mx-auto">
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 md:h-[calc(90vh-160px)] aspect-square bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 text-center mx-auto">
        <Result
          status="warning"
          title="Sin Vista 360°"
          subTitle={
            <span>
              No se encontraron fotogramas para el producto <strong>{codigo}</strong> ({marca}) en{' '}
              <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">
                public/videos/{codigo}/{marca}/
              </code>
            </span>
          }
        />
      </div>
    );
  }



  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div
        ref={containerRef}
        className="relative flex items-center justify-center w-full h-80 md:h-[calc(90vh-160px)] aspect-square bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 select-none overflow-hidden touch-none mx-auto cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Floating Preload Progress (Top Left) */}
        {preloading && (
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 pointer-events-none z-20">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
            <span>Cargando 360°... {preloadProgress}%</span>
          </div>
        )}
        {/* Render current frame scaled in place */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[currentIndex]}
          alt={`Frame 360 - ${codigo} - ${currentIndex}`}
          className="max-w-full max-h-full object-contain select-none pointer-events-none origin-center"
          style={{
            transform: `scale(${zoom})`,
            transition: isDragging.current ? 'none' : 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        />

        {/* Floating Zoom Controls (Top Right) - White background with black icons */}
        <div 
          className="absolute top-3 right-3 flex flex-col gap-1.5 z-20"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title="Acercar (Zoom In)" placement="left">
            <Button
              type="text"
              icon={<ZoomInOutlined style={{ color: '#000' }} />}
              onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
              className="bg-white hover:bg-zinc-100 border border-zinc-200/50 flex items-center justify-center w-8 h-8 rounded-full shadow-md"
            />
          </Tooltip>
          <Tooltip title="Alejar (Zoom Out)" placement="left">
            <Button
              type="text"
              icon={<ZoomOutOutlined style={{ color: '#000' }} />}
              onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
              className="bg-white hover:bg-zinc-100 border border-zinc-200/50 flex items-center justify-center w-8 h-8 rounded-full shadow-md"
            />
          </Tooltip>
          {zoom > 1 && (
            <Tooltip title="Restablecer Zoom" placement="left">
              <Button
                type="text"
                icon={<FullscreenExitOutlined style={{ color: '#000' }} />}
                onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
                className="bg-white hover:bg-zinc-100 border border-zinc-200/50 flex items-center justify-center w-8 h-8 rounded-full shadow-md"
              />
            </Tooltip>
          )}
        </div>

        {/* Interactive UI Help guides (Bottom Left / Bottom Right) */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 pointer-events-none z-10">
          <DragOutlined />
          <span>Arrastra para girar 360° • Pinch/Scroll para zoom</span>
        </div>

        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs pointer-events-none z-10">
          {zoom > 1 ? `Zoom: ${zoom.toFixed(2)}x` : `${currentIndex + 1} / ${images.length}`}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
        <RotateLeftOutlined className="animate-spin-slow" />
        <span>Usa botones negros superiores o rueda del mouse para hacer zoom.</span>
      </div>
    </div>
  );
}
