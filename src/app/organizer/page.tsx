'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PlusCircle, Users, Bell, BarChart2, Settings, Calendar, TrendingUp, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import LoadingSpinner from '@/app/LoadingSpinner';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Define the color scheme constants
const COLORS = {
  darkPurple: '#120a19',
  brightPurple: '#b967ff',
  black: '#000000',
  white: '#ffffff',
};

// NoiseBackground component
const NoiseBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const intensity = useTransform(mouseX, [-300, 300], [0.1, 0.5]);
  
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
      
      const intensityValue = intensity.get();
      
      // Apply mouse-influenced intensity
      const idata = ctx.createImageData(canvas.width, canvas.height);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const noiseBuffer = new Uint32Array(noise.data.buffer);
      const len = buffer32.length;
      
      for (let i = 0; i < len; i++) {
        if (Math.random() < intensityValue) {
          buffer32[i] = noiseBuffer[i];
        } else {
          buffer32[i] = 0;
        }
      }
      
      ctx.putImageData(idata, 0, 0);
      animationFrameId = requestAnimationFrame(renderNoise);
    };
    
    // Handle mouse movement to influence noise intensity
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate position relative to center of screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    };
    
    // Initialize
    resize();
    renderNoise();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mouseX, mouseY, intensity]);
  
  return (
    <canvas 
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-20"
    />
  );
};

// Decorative orbiting circle component
const OrbitingCircle = ({ delay = 0, duration = 15, size = 200, color = 'rgba(185, 103, 255, 0.08)' }) => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        x: [0, 40, 0, -40, 0],
        y: [0, -30, -60, -30, 0]
      }}
      transition={{ 
        duration, 
        repeat: Infinity, 
        delay,
        ease: "easeInOut"
      }}
      className="absolute rounded-full blur-3xl"
      style={{ width: size, height: size, background: color }}
    />
  );
};

interface OrganizerPageProps {
  session?: any;
  txRef?: string;
}

const OrganizerPage = ({ session: serverSession, txRef }: OrganizerPageProps) => {
  const router = useRouter();
  const { data: clientSession, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [isHeroButtonLoading, setIsHeroButtonLoading] = useState(false);
  
  // Use server-provided session or client session
  const activeSession = serverSession || clientSession;

  // Add a new function to check subscription with better handling
  const checkSubscriptionStatus = async () => {
    setIsHeroButtonLoading(true);
    try {
      // Clear any cached data first by adding cache-busting headers
      const response = await fetch('/api/subscriptions/check', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ 
          email: activeSession?.user?.email,
          userId: activeSession?.user?.id,
          _forceRefresh: true // Force server to bypass cache
        })
      });
      
      if (!response.ok) {
        console.error(`Subscription check failed with status: ${response.status}`);
        throw new Error(`Failed to verify subscription: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Subscription check result:", data);
      
      // More explicit check for active subscription
      const isActive = data.success === true && 
                      data.hasSubscription === true && 
                      data.status === 'active' &&
                      new Date(data.expiresAt) > new Date();
      
      if (isActive) {
        console.log("Active subscription confirmed, redirecting to event dashboard");
        
        // Add small delay to ensure proper state update
        setTimeout(() => {
          router.push('/organizer/create');
        }, 100);
      } else {
        console.log("No active subscription found, redirecting to create page as requested.");
        // toast.error('You need an active subscription to manage events'); // Optional: remove toast if direct redirect is preferred
        
        // Add small delay to ensure proper toast display
        setTimeout(() => {
          router.push('/organizer/create'); // Changed to redirect to /organizer/create
        }, 100); // Reduced delay for quicker redirect
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast.error('Failed to verify subscription status. Please try again.');
      // Fallback redirect to create page even on error, as per user request for this button's behavior
      setTimeout(() => {
        router.push('/organizer/create');
      }, 500);
    } finally {
      setIsHeroButtonLoading(false);
    }
  };

  // Add handleFeatureClick for feature cards
  const handleFeatureClick = async (feature: any, e: React.MouseEvent) => {
    e.preventDefault();
    
    // If feature requires subscription, check subscription status
    if (feature.requiresSubscription) {
      try {
        setLoading(true);
        const response = await fetch('/api/subscriptions/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: activeSession?.user?.email,
            userId: activeSession?.user?.id 
          })
        });
        
        const data = await response.json();
        
        // Check if user has active subscription
        if (data.hasSubscription && data.status === 'active') {
          // Redirect to feature page if subscription is active
          router.push(feature.link);
        } else {
          // Redirect to subscription page if no active subscription
          toast.error('You need an active subscription to access this feature');
          router.push('/organizer/subscribe');
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        toast.error('Failed to verify subscription status');
      } finally {
        setLoading(false);
      }
    } else {
      // Redirect directly if no subscription required
      router.push(feature.link);
    }
  };

  useEffect(() => {
    // Check for transaction reference for payment processing
    if (txRef) {
      console.log('Transaction reference detected:', txRef);
      // Handle payment verification here
    }
    
    // Shorter loading time for better UX
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [txRef]);

  // Define features for the dashboard
  const features = [
    { 
      title: 'Create New Event', 
      icon: PlusCircle, 
      description: 'Start crafting your next successful event with our easy-to-use tools.', 
      link: '/organizer/create', 
      requiresSubscription: true, // Creating events requires subscription
      badge: null,
      color: 'bg-green-600/20 hover:bg-green-600/30',
      textColor: 'text-green-400',
      action: 'Create Now'
    },
    { 
      title: 'Manage My Events', 
      icon: Calendar, 
      description: 'View, edit, and manage all your existing events and drafts.', 
      link: '/organizer/create', // Changed to redirect to create page
      requiresSubscription: false, // Changed to remove subscription check for this
      badge: null,
      color: 'bg-blue-600/20 hover:bg-blue-600/30',
      textColor: 'text-blue-400',
      action: 'Manage'
    },
    { 
      title: 'View Analytics', 
      icon: BarChart2, 
      description: 'Gain insights into your event performance and attendee engagement.', 
      link: '/organizer/analytics', 
      requiresSubscription: true,
      badge: 'Pro Feature',
      color: 'bg-purple-600/20 hover:bg-purple-600/30',
      textColor: 'text-purple-400',
      action: 'View Stats'
    },
    { 
      title: 'Audience Insights', 
      icon: Users, 
      description: 'Understand your attendees better and manage your contacts.', 
      link: '/organizer/audience', 
      requiresSubscription: true,
      badge: 'Pro Feature',
      color: 'bg-yellow-600/20 hover:bg-yellow-600/30',
      textColor: 'text-yellow-400',
      action: 'Explore'
    },
    { 
      title: 'Notifications', 
      icon: Bell, 
      description: 'Stay updated with important alerts and messages.', 
      link: '/organizer/notifications', 
      requiresSubscription: false,
      badge: null,
      color: 'bg-red-600/20 hover:bg-red-600/30',
      textColor: 'text-red-400',
      action: 'Check Alerts'
    },
    { 
      title: 'Settings', 
      icon: Settings, 
      description: 'Customize your organizer profile and application settings.', 
      link: '/organizer/settings', 
      requiresSubscription: false,
      badge: null,
      color: 'bg-gray-600/20 hover:bg-gray-600/30',
      textColor: 'text-gray-400',
      action: 'Configure'
    }
  ];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size={64} />
          <p className="text-[#b967ff] mt-4 animate-pulse font-medium tracking-wide">
            Preparing your organizer dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="min-h-screen bg-gradient-to-br from-black via-[#120a19] to-black font-sans antialiased relative overflow-hidden">
        {/* Animated Noise Background */}
        <NoiseBackground />
        
        {/* Decorative Elements */}
        <div className="absolute top-40 right-[5%] -z-5 opacity-70 pointer-events-none">
          <OrbitingCircle size={300} color="rgba(185, 103, 255, 0.08)" duration={20} />
        </div>
        <div className="absolute top-20 left-[10%] -z-5 opacity-50 pointer-events-none">
          <OrbitingCircle size={200} color="rgba(85, 13, 155, 0.1)" duration={25} delay={2} />
        </div>
        <div className="absolute bottom-40 left-[20%] -z-5 opacity-60 pointer-events-none">
          <OrbitingCircle size={250} color="rgba(185, 103, 255, 0.06)" duration={18} delay={5} />
        </div>
        
        {/* Hero Section */}
        <section className="relative pt-28 pb-20 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto mt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
              className="text-center mb-16 relative"
            >
              {/* Enhanced purple glow effects */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#b967ff]/30 rounded-full filter blur-3xl opacity-80"></div>
              <div className="absolute top-10 left-1/3 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#8a2be2]/20 rounded-full filter blur-xl"></div>
              <div className="absolute top-20 right-1/3 translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-[#cc00ff]/20 rounded-full filter blur-2xl"></div>
              
              {/* Decorative elements */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0.4, 0.8, 0.4],
                  rotate: [0, 5, 0]
                }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
                className="absolute -top-20 -right-20 w-64 h-64 border border-[#b967ff]/20 rounded-full"
              ></motion.div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0.3, 0.7, 0.3],
                  rotate: [0, -5, 0]
                }}
                transition={{ 
                  duration: 10, 
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
                className="absolute -bottom-40 -left-20 w-80 h-80 border border-[#b967ff]/15 rounded-full"
              ></motion.div>
              
              {/* Floating particles */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: Math.random() * 100 - 50,
                      y: -20,
                      opacity: 0
                    }}
                    animate={{ 
                      y: [Math.random() * 100, Math.random() * 200 + 100],
                      opacity: [0, 0.8, 0]
                    }}
                    transition={{ 
                      duration: 10 + Math.random() * 15,
                      repeat: Infinity,
                      delay: Math.random() * 5
                    }}
                    className="absolute w-2 h-2 rounded-full bg-[#b967ff]"
                    style={{ 
                      left: `${Math.random() * 100}%`,
                      filter: 'blur(1px)'
                    }}
                  />
                ))}
              </div>
              
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight leading-none md:leading-tight relative z-10"
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#cc00ff] via-[#b967ff] to-[#9966ff] drop-shadow-sm">
                  Transform <span className="relative inline-block">
                    University 
                    <motion.span 
                      className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#b967ff]/80 to-transparent"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1, delay: 1 }}
                    ></motion.span>
                  </span> Events
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto mb-10 font-light leading-relaxed md:leading-relaxed tracking-wide"
              >
                The <span className="text-[#b967ff] font-normal">all-in-one platform</span> for creating and managing exceptional events across all <span className="text-[#b967ff] font-normal">Ethiopian universities</span>
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center relative z-10"
              >
                <motion.button
                  whileHover={{ 
                    scale: 1.05, 
                    boxShadow: "0 0 30px rgba(185, 103, 255, 0.6)"
                  }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push('/organizer/form')}
                  className="px-8 py-4 bg-gradient-to-r from-[#b967ff] via-[#a346ef] to-[#9966ff] rounded-xl text-white 
                             shadow-lg shadow-[#b967ff]/40 transition-all text-lg font-medium tracking-wide overflow-hidden relative"
                  aria-label="Become an event organizer"
                >
                  <motion.span 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                    animate={{ translateX: ["100%", "-100%"] }}
                    transition={{ 
                      duration: 2,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  ></motion.span>
                  <span className="flex items-center justify-center gap-2 z-10 relative">
                    <PlusCircle className="w-5 h-5" />
                    Become an Organizer
                  </span>
                </motion.button>
                {activeSession?.user && (
                  <motion.button
                    whileHover={{ 
                      scale: 1.05,
                      borderColor: "rgba(185, 103, 255, 0.8)"
                    }}
                    whileTap={{ scale: 0.97 }}
                    onClick={checkSubscriptionStatus}
                    disabled={isHeroButtonLoading}
                    className="px-8 py-4 bg-[#120a19]/90 backdrop-blur-sm border border-[#b967ff]/40 
                               rounded-xl text-white hover:bg-[#1e1229] hover:border-[#b967ff]/70 transition-all text-lg font-medium tracking-wide"
                    aria-label="Manage your existing events"
                  >
                    {isHeroButtonLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Calendar className="w-5 h-5 text-[#b967ff]" />
                        Manage My Events
                      </span>
                    )}
                  </motion.button>
                )}
              </motion.div>
              
              {/* Stats preview */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.9 }}
                className="flex flex-wrap justify-center gap-8 mt-12"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#b967ff] font-bold text-xl">42+</span>
                  <span className="text-gray-300 text-sm">Universities</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#b967ff] font-bold text-xl">5,000+</span>
                  <span className="text-gray-300 text-sm">Events Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#b967ff] font-bold text-xl">500K+</span>
                  <span className="text-gray-300 text-sm">Attendees</span>
              </div>
              </motion.div>
        </motion.div>
          </div>
        </section>

        {/* Image Divider */}
        <div className="relative h-64 md:h-80 lg:h-96 my-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#120a19] to-transparent z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#120a19] to-transparent z-10"></div>
          <motion.div
            initial={{ scale: 1.1, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <Image
              src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&h=600&q=80"
              alt="Event organizers at work"
              fill
              className="object-cover object-center brightness-50"
              priority
            />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center px-6"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-md">
                Powerful Tools for <span className="text-[#b967ff]">University Events</span>
              </h2>
              <p className="text-xl text-gray-200 max-w-3xl mx-auto drop-shadow-md">
                Everything you need to create successful events across Ethiopian campuses
              </p>
            </motion.div>
          </div>
        </div>

        {/* Features Grid */}
        <section className="px-6 py-20">
          <div className="max-w-7xl mx-auto">
            {/* Section Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Platform <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b967ff] via-[#aa5ff9] to-[#9966ff]">Capabilities</span>
              </h2>
              <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
                Explore the tools designed to make your university events a success.
              </p>
            </motion.div>

            {/* Main features container - Subtler styling */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="bg-[#100818] rounded-2xl backdrop-blur-sm p-8 md:p-10 border border-[#b967ff]/20 shadow-lg relative overflow-hidden"
            >
              {/* Subtler Decorative elements */}
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#b967ff]/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-[#b967ff]/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 relative z-10">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                    whileHover={{ 
                      scale: 1.02,
                      borderColor: "rgba(185, 103, 255, 0.4)",
                      backgroundColor: "rgba(185, 103, 255, 0.03)" // Subtle background change on hover
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => handleFeatureClick(feature, e)} // Moved onClick to the card itself
                    className="group relative p-6 rounded-xl border border-gray-800/50 hover:border-purple-500/40 transition-all duration-200 h-full flex flex-col cursor-pointer bg-black/20 hover:bg-[#120a19]/50 shadow-md hover:shadow-purple-900/10"
                  >
                    <div className="flex items-center mb-4">
                      <div className={`p-2.5 rounded-lg ${feature.color} mr-3 inline-block shadow-sm`}>
                        <feature.icon className={`w-5 h-5 ${feature.textColor}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-white flex-grow">{feature.title}</h3>
                    </div>
                    
                    <p className="text-gray-400/80 text-sm flex-grow mb-4 line-clamp-3">{feature.description}</p>
                    
                    {/* Arrow icon for click affordance, appears on hover */}
                    <div className="mt-auto pt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                       <ChevronRight className={`w-5 h-5 ${feature.textColor}/70`} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="px-6 py-20 bg-gradient-to-b from-[#120a19]/0 via-[#120a19]/50 to-[#120a19]/0">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-white mb-4">
                What <span className="text-[#b967ff]">Universities</span> Say
              </h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Success stories from organizers across Ethiopian universities
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-[#120a19]/70 backdrop-blur-lg rounded-2xl overflow-hidden border border-[#b967ff]/20
                          hover:border-[#b967ff]/30 transition-all duration-300 group p-8 relative"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#b967ff]/10 rounded-full blur-xl -z-0"></div>
                <div className="relative z-10">
                  <div className="text-[#b967ff] mb-4">★★★★★</div>
                  <p className="text-gray-300 mb-6 italic">
                    "The platform helped us organize our annual cultural festival seamlessly. The ticketing system and attendee management features saved us countless hours."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#b967ff] to-purple-900 flex items-center justify-center text-white font-bold">
                      AAU
                    </div>
                    <div>
                      <p className="text-white font-medium">Addis Ababa University</p>
                      <p className="text-gray-400 text-sm">Student Affairs Office</p>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-[#120a19]/70 backdrop-blur-lg rounded-2xl overflow-hidden border border-[#b967ff]/20
                          hover:border-[#b967ff]/30 transition-all duration-300 group p-8 relative"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#b967ff]/10 rounded-full blur-xl -z-0"></div>
                <div className="relative z-10">
                  <div className="text-[#b967ff] mb-4">★★★★★</div>
                  <p className="text-gray-300 mb-6 italic">
                    "We implemented this for our engineering expo and saw a 40% increase in attendee engagement. The analytics helped us understand what worked best."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#b967ff] to-purple-900 flex items-center justify-center text-white font-bold">
                      BDU
                    </div>
                    <div>
                      <p className="text-white font-medium">Bahir Dar University</p>
                      <p className="text-gray-400 text-sm">Engineering Department</p>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="bg-[#120a19]/70 backdrop-blur-lg rounded-2xl overflow-hidden border border-[#b967ff]/20
                          hover:border-[#b967ff]/30 transition-all duration-300 group p-8 relative"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#b967ff]/10 rounded-full blur-xl -z-0"></div>
                <div className="relative z-10">
                  <div className="text-[#b967ff] mb-4">★★★★★</div>
                  <p className="text-gray-300 mb-6 italic">
                    "Our graduation ceremony was much easier to manage. The platform's ability to handle multiple ticket types and VIP registrations was invaluable."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#b967ff] to-purple-900 flex items-center justify-center text-white font-bold">
                      JU
                    </div>
                    <div>
                      <p className="text-white font-medium">Jimma University</p>
                      <p className="text-gray-400 text-sm">Office of Academic Affairs</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="px-6 py-20" aria-labelledby="stats-heading">
          <div className="max-w-5xl mx-auto">
            <h2 id="stats-heading" className="sr-only">Community Statistics</h2>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="bg-gradient-to-r from-[#120a19] to-black rounded-2xl backdrop-blur-lg 
                         p-10 border border-[#b967ff]/20 shadow-xl relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#b967ff]/10 rounded-full blur-3xl"></div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-[#b967ff]/10 rounded-full blur-3xl"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative z-10">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="p-4"
                >
                  <p className="text-4xl font-extrabold text-[#b967ff] mb-2 tracking-tight">42+</p>
                  <p className="text-base text-gray-300 tracking-wide font-medium">Ethiopian Universities</p>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="p-4"
                >
                  <p className="text-4xl font-extrabold text-[#b967ff] mb-2 tracking-tight">5,000+</p>
                  <p className="text-base text-gray-300 tracking-wide font-medium">Events Created</p>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className="p-4"
                >
                  <p className="text-4xl font-extrabold text-[#b967ff] mb-2 tracking-tight">500K+</p>
                  <p className="text-base text-gray-300 tracking-wide font-medium">Event Attendees</p>
                </motion.div>
                </div>
              <div className="text-center mt-8 relative z-10">
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                  className="text-lg text-gray-300 font-light tracking-wide leading-relaxed"
                >
                  Join our thriving community of successful event creators across Ethiopian universities
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.4 }}
                  className="mt-6"
                >
                  <Link 
                    href="/organizer/form"
                    className="inline-flex items-center px-6 py-3 bg-[#b967ff]/20 hover:bg-[#b967ff]/30 rounded-xl text-[#b967ff] transition-colors border border-[#b967ff]/40"
                  >
                    <span className="font-medium">Learn more about our platform</span>
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
        
        {/* Final CTA Section */}
        <section className="px-6 pb-24">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="bg-gradient-to-r from-[#120a19] via-black/60 to-[#120a19] rounded-2xl backdrop-blur-lg 
                        p-10 md:p-12 border border-[#b967ff]/30 shadow-xl relative overflow-hidden"
            >
              {/* Subtler Decorative elements */}
              <div className="absolute -left-20 -top-20 w-80 h-80 bg-[#b967ff]/8 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute right-10 bottom-10 w-60 h-60 bg-[#cc00ff]/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="max-w-2xl text-center md:text-left">
                  <motion.h2 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight"
                  >
                    Ready to transform your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#cc00ff] via-[#b967ff] to-[#9966ff]">university events</span>?
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-gray-300 text-lg mb-8 leading-relaxed"
                  >
                    Join <span className="text-[#b967ff] font-medium">42+ Ethiopian universities</span> already using our platform to create extraordinary event experiences for their students and faculty.
                  </motion.p>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4"
                  >
                    <motion.button
                      whileHover={{ 
                        scale: 1.05, 
                        boxShadow: "0 0 30px rgba(185, 103, 255, 0.6)"
                      }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => router.push('/organizer/form')}
                      className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#cc00ff] via-[#b967ff] to-[#9966ff] rounded-xl text-white 
                                shadow-lg shadow-[#b967ff]/30 transition-all text-lg font-medium tracking-wide relative overflow-hidden"
                    >
                      <motion.span 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                        animate={{ translateX: ["100%", "-100%"] }}
                        transition={{ 
                          duration: 1.5,
                          ease: "easeInOut",
                          repeat: Infinity,
                          repeatDelay: 2
                        }}
                      ></motion.span>
                      <span className="relative z-10">Get Started Now</span>
                    </motion.button>
                    <Link 
                      href="/contact"
                      className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-transparent border border-[#b967ff]/50 
                                hover:border-[#b967ff] hover:bg-[#b967ff]/15 rounded-xl text-gray-300 hover:text-white transition-all text-lg font-medium tracking-wide"
                    >
                      Contact Support
                    </Link>
                  </motion.div>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.7, delay: 0.5 }}
                  className="hidden md:block shrink-0"
                >
                  <div className="relative w-40 h-40 md:w-48 md:h-48 opacity-90">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#cc00ff] via-[#b967ff] to-[#8a2be2] rounded-full blur-md"></div>
                    <div className="absolute inset-2 bg-[#120a19] rounded-full"></div>
                    <motion.div 
                      animate={{ 
                        rotate: [0, 360],
                      }}
                      transition={{ 
                        duration: 20, 
                        repeat: Infinity,
                        ease: "linear" 
                      }}
                      className="absolute inset-0 flex items-center justify-center text-[#b967ff] text-5xl md:text-6xl font-bold"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
                      </svg>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </AnimatePresence>
  );
}

export default OrganizerPage;