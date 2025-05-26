"use client"
import React from 'react';
import { Calendar, Users, Sparkles } from 'lucide-react';

const stats = [
  { icon: Calendar, label: "Events Organized", value: "500+" },
  { icon: Users, label: "Happy Clients", value: "1000+" },
  { icon: Sparkles, label: "Years Experience", value: "15+" }
];

const HeroStats: React.FC = () => {
  return (
    <div className="grid grid-cols-1 gap-6 mt-16 md:grid-cols-3 mx-auto max-w-4xl">
      {stats.map(({ icon: Icon, label, value }, index) => (
        <div 
          key={label}
          className="p-6 transition-all duration-300 transform rounded-xl bg-white/10 backdrop-blur-md hover:scale-105 hover:bg-white/15 border border-white/5 group"
          style={{ 
            animationDelay: `${index * 0.2}s`,
            animationName: 'fadeInUp',
            animationDuration: '0.5s',
            animationFillMode: 'both'
          }}
        >
          <div className="flex items-center mb-3">
            <div className="p-2 mr-3 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30 transition-all duration-300">
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-sm uppercase tracking-wider text-gray-400 font-medium">{label}</div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
        </div>
      ))}
    </div>
  );
};
export default HeroStats;