// app/loadingSpinner.tsx
"use client"
import React from 'react';

interface LoadingSpinnerProps {
  size?: number; 
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 48 }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div
        className="border-4 border-purple-400 rounded-full border-t-transparent animate-spin"
        style={{
          width: size,
          height: size,
          borderWidth: size * 0.0833, // Adjust border width based on size
        }}
        aria-label="Loading..."
      />
    </div>
  );
};

export default LoadingSpinner;