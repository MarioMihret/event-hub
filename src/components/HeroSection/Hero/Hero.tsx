"use client"
import React from 'react';
import Background from './Background';
import HeroContent from './HeroContent';

const Hero: React.FC = () => (
  <section 
    id="hero" 
    className="relative min-h-screen overflow-hidden"
    aria-label="Hero Section"
  >
    <Background />
    <HeroContent />
  </section>
);

export default Hero;