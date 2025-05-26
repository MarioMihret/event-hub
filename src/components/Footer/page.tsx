"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import FooterNav from './FooterNav';
import FooterSocial from './FooterSocial';
import FooterNewsletter from './FooterNewsletter';
import FooterCopyright from './FooterCopyright';

const Footer: React.FC = () => {
  const pathname = usePathname();
  
  // Check if current page is an auth page
  const isAuthPage = pathname?.startsWith('/auth');
  
  // If we're on an auth page, don't render the footer
  if (isAuthPage) {
    return null;
  }
  
  return (
    <footer className="bg-black border-t border-white/10">
      <div className="container px-6 py-12 mx-auto">
        <div className="grid grid-cols-1 gap-12 mb-12 md:grid-cols-4">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center">
              <span className="self-center text-xl font-semibold whitespace-nowrap text-white">
                User Organiser
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              The ultimate platform for organizing events and managing your attendees.
            </p>
            <FooterSocial />
          </div>
          <FooterNav />
          <div className="md:col-span-2">
            <FooterNewsletter />
          </div>
        </div>
        <FooterCopyright />
      </div>
    </footer>
  );
};

export default Footer;