"use client"
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Loader, ArrowRight, Clock, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';

// Color scheme constants
const COLORS = {
  darkPurple: '#120a19',
  brightPurple: '#b967ff',
  black: '#000000',
  white: '#ffffff',
};

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

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || 'Message sent successfully! We\'ll get back to you soon.');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        toast.error(result.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] text-white">
      <NoiseBackground />
      
      {/* Hero Section */}
      <div className="relative py-24 sm:py-32">
        <div className="absolute inset-0 opacity-20">
          <Image
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-1.2.1&auto=format&fit=crop&w=2070&q=80"
            alt="Contact Us"
            width={2070}
            height={1380}
            priority
            unoptimized={true}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black to-[#120a19] mix-blend-multiply" />
        </div>
        <div className="relative max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Get in <span className="text-[#b967ff]">Touch</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-xl text-gray-300 max-w-3xl"
          >
            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </motion.p>
        </div>
      </div>

      {/* Contact Section */}
      <div className="relative pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact Info */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl border border-[#b967ff]/20 shadow-lg p-8"
            >
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl mb-6">
                Contact <span className="text-[#b967ff]">Information</span>
              </h2>
              <p className="text-gray-300 mb-8">
                Get in touch with us through any of these channels:
              </p>
              
              <div className="space-y-6">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-start"
                >
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex-shrink-0">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-white">Our Location</h3>
                    <p className="mt-1 text-gray-300">
                      123 Event Street<br />
                      San Francisco, CA 94107
                    </p>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start"
                >
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex-shrink-0">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-white">Phone</h3>
                    <p className="mt-1 text-gray-300">+1 (555) 123-4567</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start"
                >
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex-shrink-0">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-white">Email</h3>
                    <p className="mt-1 text-gray-300">support@example.com</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-start"
                >
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex-shrink-0">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-white">Business Hours</h3>
                    <p className="mt-1 text-gray-300">
                      Monday - Friday: 9:00 AM - 5:00 PM<br />
                      Weekend: Closed
                    </p>
                </div>
                </motion.div>
                </div>
              
              <div className="mt-12 pt-8 border-t border-[#b967ff]/20">
                <h3 className="text-lg font-medium text-white mb-4">Connect With Us</h3>
                <div className="flex space-x-4">
                  <a 
                    href="#" 
                    className="h-10 w-10 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex items-center justify-center hover:bg-[#b967ff]/30 transition-colors"
                    aria-label="Twitter"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                  <a 
                    href="#" 
                    className="h-10 w-10 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex items-center justify-center hover:bg-[#b967ff]/30 transition-colors"
                    aria-label="Facebook"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                    </svg>
                  </a>
                  <a 
                    href="#" 
                    className="h-10 w-10 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex items-center justify-center hover:bg-[#b967ff]/30 transition-colors"
                    aria-label="Instagram"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                    </svg>
                  </a>
                  <a 
                    href="#" 
                    className="h-10 w-10 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex items-center justify-center hover:bg-[#b967ff]/30 transition-colors"
                    aria-label="LinkedIn"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </a>
                </div>
            </div>
            </motion.div>
            
            {/* Contact Form */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl border border-[#b967ff]/20 shadow-lg p-8"
            >
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl mb-6">
                Send us a <span className="text-[#b967ff]">Message</span>
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                    Full name
                  </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="py-3 px-4 block w-full bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white"
                    placeholder="Your name"
                    />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="py-3 px-4 block w-full bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white"
                    placeholder="your.email@example.com"
                    />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-1">
                    Subject
                  </label>
                    <input
                      type="text"
                      name="subject"
                      id="subject"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="py-3 px-4 block w-full bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white"
                    placeholder="What is this regarding?"
                    />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                    Message
                  </label>
                    <textarea
                      id="message"
                      name="message"
                    rows={5}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="py-3 px-4 block w-full bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white"
                    placeholder="Your message here..."
                    />
                </div>
                <div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center py-3 px-6 border border-transparent shadow-lg text-base font-medium rounded-xl text-white bg-[#b967ff] hover:bg-[#b967ff]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b967ff] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[#b967ff]/20"
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="-ml-1 mr-2 h-5 w-5" />
                        Send Message
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Map Section - REMOVED */}
      {/* 
      <div className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl border border-[#b967ff]/20 shadow-lg overflow-hidden"
          >
            <div className="p-4 bg-[#1A0D25]/70 border-b border-[#b967ff]/20">
              <h3 className="text-xl font-medium text-white">Ethiopian Universities</h3>
              <p className="text-gray-300 text-sm">Our platform serves 42 universities across Ethiopia</p>
            </div>
            <iframe
              title="Ethiopian Universities"
              className="w-full h-96"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7930800.088635936!2d34.30212296929779!3d8.619942736222347!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1635d0cedd6cfd2b%3A0x7bf6a67f5348c55a!2sAddis%20Ababa%20University!5e0!3m2!1sen!2sus!4v1659922445811!5m2!1sen!2sus"
              frameBorder="0"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="p-4 bg-[#1A0D25]/70 border-t border-[#b967ff]/20">
              <h4 className="text-lg font-medium text-white mb-2">Major Universities</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div className="text-gray-300 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#b967ff]"></span>
                  Addis Ababa University
                </div>
                <div className="text-gray-300 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#b967ff]"></span>
                  Jimma University
                </div>
                <div className="text-gray-300 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#b967ff]"></span>
                  Bahir Dar University
                </div>
                <div className="text-gray-300 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#b967ff]"></span>
                  Mekelle University
                </div>
                <div className="text-gray-300 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#b967ff]"></span>
                  Hawassa University
                </div>
                <div className="text-gray-300 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#b967ff]"></span>
                  Gondar University
                </div>
                <div className="text-gray-300 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#b967ff]"></span>
                  Haramaya University
                </div>
                <div className="text-gray-300 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#b967ff]"></span>
                  Arba Minch University
                </div>
              </div>
              <p className="text-gray-400 text-xs mt-3">And 34 more universities across the country</p>
            </div>
          </motion.div>
        </div>
      </div>
      */}
      
      {/* CTA Section */}
      <div className="bg-gradient-to-r from-[#1A0D25] to-[#120a19] py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-[#1A0D25]/70 backdrop-blur-sm rounded-2xl border border-[#b967ff]/20 shadow-lg py-10 px-6 lg:px-16 md:py-16 overflow-hidden"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 -mt-16 -mr-16 h-40 w-40 bg-[#b967ff]/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-32 w-32 bg-[#b967ff]/10 rounded-full blur-2xl"></div>
            
            <div className="relative lg:flex lg:items-center lg:justify-between">
              <div className="lg:max-w-2xl">
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                  <span className="block">Have an event in mind?</span>
                  <span className="block text-[#b967ff]">Start planning today.</span>
                </h2>
                <p className="mt-4 text-lg text-gray-300">
                  Explore our platform to find inspiration and create your next unforgettable event.
                </p>
              </div>
              <div className="mt-10 lg:mt-0 lg:ml-10 lg:flex-shrink-0">
                <Link 
                  href="/events"
                  className="inline-flex items-center justify-center px-6 py-4 border border-transparent text-base font-medium rounded-xl text-white bg-[#b967ff] hover:bg-[#b967ff]/90 shadow-lg shadow-[#b967ff]/20 transition-all hover:scale-105"
                >
                  Browse Events
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
          </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}