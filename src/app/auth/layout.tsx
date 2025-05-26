"use client";

import React from 'react';
import { NoiseBackground } from "@/components/ui/noise-background";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="bg-gradient-to-br from-black to-gray-900 min-h-screen">
      <NoiseBackground />
      {children}
    </main>
  );
} 