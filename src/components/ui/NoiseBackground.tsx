"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useTransform } from "framer-motion";

// NoiseBackground component
const NoiseBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const intensity = useTransform(mouseX, [-300, 300], [0.1, 0.3]); // Reduced max intensity
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let noise: ImageData;
    let lastTime = 0;
    const frameInterval = 100; // Only update every 100ms
    
    // Set canvas to lower resolution for better performance
    const resize = () => {
      canvas.width = Math.min(window.innerWidth, 1920) / 2;
      canvas.height = Math.min(window.innerHeight, 1080) / 2;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      createNoise();
    };
    
    // Create static noise
    const createNoise = () => {
      const idata = ctx.createImageData(canvas.width, canvas.height);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const len = buffer32.length;
      
      for (let i = 0; i < len; i++) {
        // Purple-themed noise with reduced opacity
        const alpha = Math.random() * 0.03; // Reduced opacity for better performance
        if (Math.random() < 0.02) { // Fewer bright spots
          // ABGR format for canvas
          buffer32[i] = (alpha * 255 < 0 ? 0 : alpha * 255 > 255 ? 255 : alpha * 255) << 24 | 
                       (Math.random() * 100) << 16 | 
                       (Math.random() * 50) << 8 | 
                       0xB9; // Hint of bright purple
        } else {
          buffer32[i] = (alpha * 255 < 0 ? 0 : alpha * 255 > 255 ? 255 : alpha * 255) << 24 | 
                       (Math.random() * 30) << 16 | 
                       (Math.random() * 15) << 8 | 
                       0x30;
        }
      }
      
      noise = idata;
    };
    
    // Animate noise with throttling
    const renderNoise = (timestamp: number) => {
      if (!ctx || !noise) return;
      
      animationFrameId = requestAnimationFrame(renderNoise);
      
      // Throttle rendering to improve performance
      if (timestamp - lastTime < frameInterval) return;
      lastTime = timestamp;
      
      const intensityValue = intensity.get();
      
      // Apply mouse-influenced intensity
      const idata = ctx.createImageData(canvas.width, canvas.height);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const noiseBuffer = new Uint32Array(noise.data.buffer);
      const len = buffer32.length;
      
      // Reduce the number of pixels we process
      for (let i = 0; i < len; i++) {
        if (Math.random() < intensityValue * 0.6) { // Reduced multiplier
          buffer32[i] = noiseBuffer[i];
        } else {
          buffer32[i] = 0;
        }
      }
      
      ctx.putImageData(idata, 0, 0);
    };
    
    // Throttle mouse movement to reduce updates
    let lastMoveTime = 0;
    const mouseMoveThrottle = 50; // ms
    
    // Handle mouse movement to influence noise intensity
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMoveTime < mouseMoveThrottle) return;
      lastMoveTime = now;
      
      // Calculate position relative to center of screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    };
    
    // Initialize
    resize();
    animationFrameId = requestAnimationFrame(renderNoise);
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mouseX, mouseY, intensity]);
  
  return (
    <canvas 
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-10"
      aria-hidden="true" // Added aria-hidden for accessibility
    />
  );
};

export default NoiseBackground; 