"use client";

import React, { useEffect, useRef } from 'react';

export const NoiseBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let noise: ImageData;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createNoise();
    };
    
    const createNoise = () => {
      const idata = ctx.createImageData(canvas.width, canvas.height);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const len = buffer32.length;
      
      for (let i = 0; i < len; i++) {
        const alpha = Math.random() * 0.05;
        if (Math.random() < 0.03) {
          buffer32[i] = (alpha * 255 < 0 ? 0 : alpha * 255 > 255 ? 255 : alpha * 255) << 24 | 
                       (Math.random() * 100) << 16 | 
                       (Math.random() * 50) << 8 | 
                       0xB9;
        } else {
          buffer32[i] = (alpha * 255 < 0 ? 0 : alpha * 255 > 255 ? 255 : alpha * 255) << 24 | 
                       (Math.random() * 30) << 16 | 
                       (Math.random() * 15) << 8 | 
                       0x30;
        }
      }
      
      noise = idata;
    };
    
    const renderNoise = () => {
      if (!ctx || !noise) return;
      
      const idata = ctx.createImageData(canvas.width, canvas.height);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const noiseBuffer = new Uint32Array(noise.data.buffer);
      const len = buffer32.length;
      
      for (let i = 0; i < len; i++) {
        if (Math.random() < 0.3) {
          buffer32[i] = noiseBuffer[i];
        } else {
          buffer32[i] = 0;
        }
      }
      
      ctx.putImageData(idata, 0, 0);
      animationFrameId = requestAnimationFrame(renderNoise);
    };
    
    resize();
    renderNoise();
    window.addEventListener('resize', resize);
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-10"
      aria-hidden="true"
    />
  );
}; 