"use client";
import { useEffect, useRef } from 'react';

export default function GenerateNoise() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = 400;
    const height = 400;
    
    canvas.width = width;
    canvas.height = height;
    
    // Generate noise
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Random grayscale value
      const value = Math.floor(Math.random() * 255);
      data[i] = value;     // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
      data[i + 3] = 25;   // Alpha (low opacity)
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to PNG and download
    const downloadLink = document.createElement('a');
    downloadLink.href = canvas.toDataURL('image/png');
    downloadLink.download = 'noise.png';
    downloadLink.innerText = 'Download Noise Texture';
    downloadLink.className = 'bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700';
    
    const container = document.getElementById('download-container');
    if (container) {
      container.appendChild(downloadLink);
    }
  }, []);

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-xl font-bold mb-4">Noise Texture Generator</h1>
      <p className="mb-4">Click the button below to download a noise texture for your project.</p>
      <canvas ref={canvasRef} className="mb-4 border border-gray-300" style={{ display: 'none' }}></canvas>
      <div id="download-container"></div>
    </div>
  );
} 