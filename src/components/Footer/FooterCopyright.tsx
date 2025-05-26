"use client";

import React from 'react';
import { Calendar } from 'lucide-react';

const FooterCopyright: React.FC = () => {
  return (
    <div className="pt-8 mt-8 border-t border-white/10">
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-purple-400" />
          <span className="font-semibold text-white">EventHub</span>
        </div>
        <p className="text-sm text-gray-300">
          © {new Date().getFullYear()} EventHub. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default FooterCopyright;