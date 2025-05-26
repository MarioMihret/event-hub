"use client"
import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Gift,
  Camera,
  Music,
  Coffee,
  Ticket,
  MessageSquare,
  Award,
  ThumbsUp,
  Clock,
  Shield,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// NoiseBackground component
const NoiseBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let noise: ImageData;
    
    // Set canvas to full screen
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Create initial noise
      createNoise();
    };
    
    // Create static noise
    const createNoise = () => {
      const idata = ctx.createImageData(canvas.width, canvas.height);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const len = buffer32.length;
      
      for (let i = 0; i < len; i++) {
        // Purple-themed noise
        const alpha = Math.random() * 0.05; // Very subtle transparency
        if (Math.random() < 0.03) { // Occasional bright purple sparkles
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
    
    // Animate noise
    const renderNoise = () => {
      if (!ctx || !noise) return;
      
      // Apply subtle intensity
      const idata = ctx.createImageData(canvas.width, canvas.height);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const noiseBuffer = new Uint32Array(noise.data.buffer);
      const len = buffer32.length;
      
      for (let i = 0; i < len; i++) {
        if (Math.random() < 0.3) {
          buffer32[i] = noiseBuffer[i];
        } else {
          buffer32[i] = 0;
        }
      }
      
      ctx.putImageData(idata, 0, 0);
      animationFrameId = requestAnimationFrame(renderNoise);
    };
    
    // Initialize
    resize();
    renderNoise();
    window.addEventListener('resize', resize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-20"
    />
  );
};

const services = [
  {
    icon: Calendar,
    title: 'Event Planning',
    description: 'Comprehensive event planning and coordination services.'
  },
  {
    icon: Users,
    title: 'Venue Management',
    description: 'Perfect venue selection and setup for your events.'
  },
  {
    icon: Gift,
    title: 'Corporate Events',
    description: 'Professional corporate event management solutions.'
  },
  {
    icon: Camera,
    title: 'Photography',
    description: 'Professional event photography and videography.'
  },
  {
    icon: Music,
    title: 'Entertainment',
    description: 'Top-tier entertainment booking and management.'
  },
  {
    icon: Coffee,
    title: 'Catering',
    description: 'Exquisite catering services for all occasions.'
  },
  {
    icon: Ticket,
    title: 'Ticketing',
    description: 'Seamless ticket management and distribution.'
  },
  {
    icon: MessageSquare,
    title: 'Marketing',
    description: 'Comprehensive event marketing and promotion.'
  }
];

const benefits = [
  {
    icon: Award,
    title: 'Expert Team',
    description: 'Experienced professionals dedicated to your success.'
  },
  {
    icon: ThumbsUp,
    title: 'Quality Service',
    description: 'Commitment to excellence in every detail.'
  },
  {
    icon: Clock,
    title: 'Timely Delivery',
    description: 'On-time execution of all event elements.'
  },
  {
    icon: Shield,
    title: 'Reliable Support',
    description: '24/7 support throughout your event journey.'
  }
];

// Reusable Card Component (Used for Benefits section)
const FeatureCard = ({ icon: Icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay }}
    className="flex flex-col items-center text-center p-6 bg-[#1A0D25]/60 backdrop-blur-sm rounded-xl border border-[#b967ff]/20 shadow-lg hover:border-[#b967ff]/40 hover:bg-[#1A0D25]/80 transition-all duration-300 h-full"
  >
    <div className="flex-shrink-0 mb-4 p-3 bg-gradient-to-br from-purple-600/50 to-purple-800/50 rounded-full">
      <Icon className="h-7 w-7 text-purple-200" aria-hidden="true" />
    </div>
    <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
    <p className="text-sm text-gray-300 flex-grow">{description}</p>
  </motion.div>
);

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] text-white">
      <NoiseBackground />
      
      {/* Hero Section - Use next/image */}
      <div className="relative py-24 sm:py-32">
        <div className="absolute inset-0 opacity-20">
          <Image
            className="h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1531058020387-3be344556be6?ixlib=rb-1.2.1&auto=format&fit=crop&w=2070&q=80"
            alt="About EventHub Team Meeting"
            fill
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black via-transparent to-[#120a19]/50 mix-blend-multiply" />
        </div>
        
        <div className="relative max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl"
          >
            About <span className="text-[#b967ff]">EventHub</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-3xl text-xl text-gray-300"
          >
            Connecting communities through seamless event experiences. Discover our mission, values, and the team driving EventHub forward.
          </motion.p>
        </div>
      </div>

      {/* Our Mission Section (Optional Addition) */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-extrabold text-white sm:text-4xl mb-4"
          >
            Our <span className="text-[#b967ff]">Mission</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-300 leading-relaxed"
          >
            To empower organizers and delight attendees by providing the most intuitive, reliable, and feature-rich platform for managing and discovering events of all sizes.
          </motion.p>
        </div>
      </section>

      {/* Services Grid - Reverted Styling */}
      <section className="py-16 sm:py-24 bg-[#100818]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-extrabold text-white sm:text-4xl mb-4"
            >
              What We <span className="text-[#b967ff]">Offer</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-300 max-w-2xl mx-auto"
            >
              A comprehensive suite of tools designed for modern event management.
            </motion.p>
          </div>

          {/* Reverted Card Implementation for Services */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }} // Keep stagger
                className="relative group" // Use group for hover effects
              >
                {/* Applying a style similar to the assumed previous state */}
                <div className="relative p-6 bg-[#1A0D25]/70 backdrop-blur-sm rounded-lg border border-[#b967ff]/20 shadow-lg transition-all duration-300 hover:shadow-[#b967ff]/20 hover:shadow-xl hover:border-[#b967ff]/40 group-hover:-translate-y-1 h-full flex flex-col">
                  <service.icon className="h-10 w-10 text-[#b967ff] mb-4 flex-shrink-0" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    {service.title}
                  </h3>
                  <p className="text-sm text-gray-400 flex-grow">
                    {service.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Grid (Uses FeatureCard) */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-extrabold text-white sm:text-4xl mb-4"
            >
              Why Choose <span className="text-[#b967ff]">EventHub?</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-300 max-w-2xl mx-auto"
            >
              Experience the difference with our dedicated platform and support.
            </motion.p>
          </div>

          {/* Use FeatureCard component for Benefits */}
           <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <FeatureCard 
                key={index} 
                icon={benefit.icon} 
                title={benefit.title} 
                description={benefit.description} 
                delay={index * 0.05} 
              />
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#1A0D25] to-[#120a19] py-16 sm:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-[#1A0D25]/80 backdrop-blur-lg rounded-2xl border border-[#b967ff]/30 shadow-xl py-12 px-6 lg:px-16 md:py-16 overflow-hidden"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 -mt-16 -mr-16 h-40 w-40 bg-[#b967ff]/10 rounded-full blur-3xl opacity-70"></div>
            <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-32 w-32 bg-[#b967ff]/10 rounded-full blur-3xl opacity-70"></div>
            
            <div className="relative lg:flex lg:items-center lg:justify-between gap-8">
              <div className="lg:max-w-xl">
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                  <span className="block">Ready to Create Amazing Events?</span>
                  <span className="block text-[#b967ff]">Join EventHub Today.</span>
                </h2>
                <p className="mt-4 text-lg text-gray-300">
                  Sign up as an organizer or explore upcoming events in your area.
                </p>
              </div>
              <div className="mt-10 lg:mt-0 lg:flex-shrink-0 flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/organizer"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 shadow-lg shadow-purple-500/20 transition-all hover:scale-105"
                >
                  Become an Organizer
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link 
                  href="/events"
                  className="inline-flex items-center justify-center px-6 py-3 border border-gray-700/50 text-base font-medium rounded-lg text-gray-300 bg-gray-800/60 hover:bg-gray-700/80 hover:text-white transition-all hover:scale-105"
                >
                  Explore Events
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}