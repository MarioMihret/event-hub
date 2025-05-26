"use client"
import React, { useEffect, useRef } from 'react';

// Expanded partner list with real brand logos
const partners = [
  { name: "Spotify", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Spotify_icon.svg/1982px-Spotify_icon.svg.png" },
  { name: "Microsoft", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/2048px-Microsoft_logo.svg.png" },
  { name: "Google", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/2048px-Google_%22G%22_Logo.svg.png" },
  { name: "Amazon", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/2560px-Amazon_logo.svg.png" },
  { name: "Apple", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/1667px-Apple_logo_black.svg.png" },
  { name: "Meta", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/1280px-Meta_Platforms_Inc._logo.svg.png" },
  { name: "Netflix", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/2560px-Netflix_2015_logo.svg.png" },
  { name: "Adobe", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Adobe_Systems_logo_and_wordmark.svg/2560px-Adobe_Systems_logo_and_wordmark.svg.png" },
  { name: "Airbnb", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Airbnb_Logo_B%C3%A9lo.svg/2560px-Airbnb_Logo_B%C3%A9lo.svg.png" },
  { name: "Slack", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Slack_Technologies_Logo.svg/2560px-Slack_Technologies_Logo.svg.png" },
  { name: "Salesforce", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/2560px-Salesforce.com_logo.svg.png" },
  { name: "Dropbox", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Dropbox_logo_%282013-2020%29.svg/2560px-Dropbox_logo_%282013-2020%29.svg.png" }
];

const Partners: React.FC = () => {
  // Create two separate refs for each marquee track
  const track1Ref = useRef<HTMLDivElement>(null);
  const track2Ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Function to check if the browser supports animation API
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      // Don't animate if user prefers reduced motion
      return;
    }

    // Set different animation speeds for variety
    if (track1Ref.current && track2Ref.current) {
      track1Ref.current.style.animationDuration = '35s';
      track2Ref.current.style.animationDuration = '40s';
    }
  }, []);

  // Split the partners into two groups for two tracks
  const firstHalf = partners.slice(0, partners.length / 2);
  const secondHalf = partners.slice(partners.length / 2);

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Trusted Partners</h2>
          <p className="text-gray-300 text-lg">
            Working with leading brands to deliver exceptional experiences
          </p>
        </div>

        {/* First marquee track */}
        <div className="marquee-container mb-12">
          <div 
            ref={track1Ref} 
            className="marquee-track flex items-center animate-marquee"
          >
            {/* Double the items to create seamless loop */}
            {[...firstHalf, ...firstHalf].map((partner, index) => (
              <div
                key={`${partner.name}-${index}`}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 mx-4 flex items-center justify-center hover:bg-white/10 transition-colors h-24 w-40 shrink-0"
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="h-10 max-w-full object-contain filter invert hover:invert-0 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Second marquee track (reverse direction) */}
        <div className="marquee-container">
          <div 
            ref={track2Ref} 
            className="marquee-track flex items-center animate-marquee-reverse"
          >
            {/* Double the items to create seamless loop */}
            {[...secondHalf, ...secondHalf].map((partner, index) => (
              <div
                key={`${partner.name}-${index}`}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 mx-4 flex items-center justify-center hover:bg-white/10 transition-colors h-24 w-40 shrink-0"
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="h-10 max-w-full object-contain filter invert hover:invert-0 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Partners;