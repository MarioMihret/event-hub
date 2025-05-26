"use client"
import React from 'react';
import { TypewriterText } from './TypewriterText';
import CallToAction from './CallToAction';
import HeroStats from './HeroStats';

const HeroContent: React.FC = () => (
  <div className="container relative px-6 pt-24 pb-16 mx-auto md:pt-32">
    <div className="max-w-4xl">
      <h1 className="mb-8 text-5xl font-bold leading-tight text-white md:text-7xl animate-slide-up">
        Creating{' '}
        <span className="bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-purple-500">
          <TypewriterText 
            words={['Unforgettable', 'Magical', 'Perfect']} 
            delay={150}
          />
        </span>{' '}
        Events
      </h1>
      
      <p className="mb-10 text-xl leading-relaxed text-gray-200 md:text-2xl animate-slide-up-delay max-w-3xl">
        Transform your vision into extraordinary experiences. From corporate gatherings 
        to dream weddings, we create moments that last a lifetime.
      </p>

      <CallToAction />
      <HeroStats />
    </div>
  </div>
);

export default HeroContent;