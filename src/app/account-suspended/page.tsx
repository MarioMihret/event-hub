"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { NoiseBackground } from "@/components/ui/noise-background";

export default function AccountSuspended() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };

  return (
    <main className="bg-gradient-to-br from-black to-gray-900 min-h-screen flex flex-col items-center justify-center relative text-white p-4">
      <NoiseBackground />
      <div className="max-w-lg w-full bg-black/50 backdrop-blur-lg rounded-lg p-8 shadow-xl border border-gray-800 z-10 text-center">
        <div className="mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-red-500 mx-auto">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold mb-4">Account Suspended</h1>
        
        <p className="mb-6 text-gray-300">
          Your account has been suspended by an administrator. If you believe this is an error, please contact support.
        </p>
        
        <div className="flex flex-col gap-4 mt-8">
          <button
            onClick={handleSignOut}
            className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 border border-gray-700 rounded-md transition"
          >
            Sign Out
          </button>
          
          <Link href="/contact" className="text-gray-400 hover:text-white text-sm transition">
            Contact Support
          </Link>
        </div>
      </div>
    </main>
  );
} 