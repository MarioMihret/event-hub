import React from 'react';
import { PartyPopper, Building2, Heart, Music, Camera, Utensils } from 'lucide-react';

const services = [
  {
    icon: PartyPopper,
    title: "Private Events",
    description: "Birthdays, anniversaries, and celebrations"
  },
  {
    icon: Building2,
    title: "Corporate Events",
    description: "Conferences, seminars, and team building"
  },
  {
    icon: Heart,
    title: "Weddings",
    description: "Your perfect day, perfectly planned"
  },
  {
    icon: Music,
    title: "Entertainment",
    description: "Live music, DJs, and performances"
  },
  {
    icon: Camera,
    title: "Photography",
    description: "Professional photo and video coverage"
  },
  {
    icon: Utensils,
    title: "Catering",
    description: "Gourmet food and beverage service"
  }
];

const Services: React.FC = () => {
  return (
    <section className="relative py-20 bg-transparent bg-clip-content">
      <div className="container px-6 mx-auto">
        <div className="max-w-3xl mx-auto mb-16 text-center">
          <h2 className="mb-6 text-4xl font-bold">Our Services</h2>
          <p className="text-lg text-gray-300">
            Comprehensive event solutions tailored to your needs
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {services.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="p-8 transition-all duration-300 group bg-white/5 backdrop-blur-sm rounded-xl hover:transform hover:scale-105"
            >
              <Icon className="w-12 h-12 mb-4 text-purple-400 transition-transform group-hover:scale-110" />
              <h3 className="mb-2 text-xl font-semibold">{title}</h3>
              <p className="text-gray-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default Services;