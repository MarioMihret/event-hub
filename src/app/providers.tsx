"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SessionProvider } from "next-auth/react";
import { SessionEffectManager } from '@/components/SessionEffectManager';

// Dynamically import ThemeProvider to reduce initial chunk size
// No need for SSR since theme is determined client-side anyway
const ThemeProvider = dynamic(
  () => import("next-themes").then((mod) => mod.ThemeProvider),
  { ssr: false }
);

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Use client-side only rendering for heavy providers
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a simple wrapper for SSR to avoid hydration issues
  // We still need SessionProvider here for the initial server render pass
  // and SessionEffectManager needs the context.
  if (!mounted) {
    // Render SessionProvider even when not fully mounted client-side 
    // to provide context immediately. SessionEffectManager depends on it.
    return (
      <SessionProvider>
        <SessionEffectManager />
        {children} 
      </SessionProvider>
    );
  }

  // Fully mounted client-side rendering
  return (
    <SessionProvider>
      <SessionEffectManager />
      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
} 