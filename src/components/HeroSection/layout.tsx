"use client"
import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Hero from "./Hero/Hero";
import About from "./Sections/About";
import Services from "./Sections/Services";
import Features from "./Sections/Features";
import Testimonials from "./Sections/Testimonials";
import Pricing from "./Sections/Pricing";
import Partners from "./Sections/Partners";
import CTA from "./Sections/CTA";

const Layout = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Wait for component to mount to access theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function for dark mode conditional classes
  const getBackgroundClass = (alwaysDark = false) => {
    if (!mounted) return "min-h-screen text-white bg-black"; // Default for SSR
    return theme === "dark" 
      ? "min-h-screen text-white" 
      : "min-h-screen text-white bg-black";
  };

  return (
    <main className={`${getBackgroundClass()} relative`} id="main-content">
      <Hero />
      <About />
      <Services />
      <Features />  
      <Pricing />
      <Testimonials />
      <Partners />
      <CTA />
    </main>
  );
};
export default Layout;
