import React from 'react';
import { Calendar, Users, Award } from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Event Planning',
    description: 'Expert planning and coordination for events of any size'
  },
  {
    icon: Users,
    title: 'Professional Team',
    description: 'Dedicated team of experienced event professionals'
  },
  {
    icon: Award,
    title: 'Quality Service',
    description: 'Award-winning service with attention to every detail'
  }
];

export default function About() {
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="container px-6 mx-auto">
        <div className="max-w-3xl mx-auto mb-16 text-center">
          <h2 className="mb-6 text-4xl font-bold">
            Why Choose{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              EventHub
            </span>
          </h2>
          <p className="text-lg text-gray-300">
            We bring your vision to life with exceptional planning, flawless execution, 
            and memorable experiences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div 
              key={title}
              className="p-6 transition-all duration-300 bg-white/5 backdrop-blur-sm rounded-xl hover:transform hover:scale-105"
            >
              <Icon className="w-12 h-12 mb-4 text-purple-400" />
              <h3 className="mb-3 text-xl font-semibold">{title}</h3>
              <p className="text-gray-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

 