"use client"
import React from 'react';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    content: "The team went above and beyond our expectations. Our wedding was absolutely perfect!",
    author: "Sarah Johnson",
    role: "Bride",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80"
  },
  {
    content: "Professional, creative, and detail-oriented. They made our corporate event a huge success.",
    author: "Michael Chen",
    role: "Marketing Director",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80"
  },
  {
    content: "The best event planning service I've ever worked with. Highly recommended!",
    author: "Emma Davis",
    role: "Event Coordinator",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80"
  }
];

const Testimonials: React.FC = () => {
  return (
    <section className="relative py-20">
      <div className="container px-6 mx-auto">
        <div className="max-w-3xl mx-auto mb-16 text-center">
          <h2 className="mb-6 text-4xl font-bold">What Our Clients Say</h2>
          <p className="text-lg text-gray-300">
            Dont just take our word for it - hear from some of our satisfied clients
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.author}
              className="p-8 transition-all duration-300 bg-white/5 backdrop-blur-sm rounded-xl hover:transform hover:scale-105"
            >
              <Quote className="w-10 h-10 mb-6 text-purple-400" />
              <p className="mb-6 text-gray-300">{testimonial.content}</p>
              
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.author}
                  className="object-cover w-12 h-12 rounded-full"
                />
                <div>
                  <div className="font-semibold">{testimonial.author}</div>
                  <div className="text-sm text-gray-400">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;