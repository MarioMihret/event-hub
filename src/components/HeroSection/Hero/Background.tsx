"use client";
import React, { useEffect, useState } from "react";

const Background: React.FC = () => {
  const [particles, setParticles] = useState<{ left: string; top: string; delay: string; duration: string }[]>([]);

  useEffect(() => {
    // Generate random positions only on the client
    const generatedParticles = [...Array(20)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${5 + Math.random() * 5}s`,
    }));

    setParticles(generatedParticles);
  }, []); // Runs only on mount

  return (
    <>
      <div
        className="fixed inset-0 bg-center bg-no-repeat bg-cover -z-10"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
      </div>

      {/* Animated Particles */}
      <div className="fixed inset-0 pointer-events-none">
        {particles.map((particle, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          >
            <div className="w-2 h-2 rounded-full bg-white/20" />
          </div>
        ))}
      </div>
    </>
  );
};

export default Background;
