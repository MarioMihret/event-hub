"use client";

import React from 'react';
import { Twitter, Facebook, Instagram, Linkedin } from 'lucide-react';

const social = [
  { name: 'Twitter', href: '#', icon: Twitter },
  { name: 'Facebook', href: '#', icon: Facebook },
  { name: 'Instagram', href: '#', icon: Instagram },
  { name: 'LinkedIn', href: '#', icon: Linkedin }
];

const FooterSocial: React.FC = () => {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-4">Follow Us</h3>
      <div className="flex space-x-4">
        {social.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.name}
              href={item.href}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <span className="sr-only">{item.name}</span>
              <Icon className="w-6 h-6" />
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default FooterSocial;