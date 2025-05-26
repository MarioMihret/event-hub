import React from 'react';

const BackgroundElements: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Top left decorative element */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#b967ff]/20 to-transparent rounded-full filter blur-3xl opacity-30 transform -translate-x-1/2 -translate-y-1/2"></div>
      
      {/* Bottom right decorative element */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-[#7d4bff]/20 to-transparent rounded-full filter blur-3xl opacity-30 transform translate-x-1/3 translate-y-1/3"></div>
      
      {/* Center decorative element */}
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-r from-[#b967ff]/10 to-[#7d4bff]/10 rounded-full filter blur-3xl opacity-20 transform -translate-x-1/2 -translate-y-1/2"></div>
      
      {/* Random floating elements */}
      <div className="absolute top-1/4 right-1/4 w-4 h-4 bg-[#b967ff]/30 rounded-full"></div>
      <div className="absolute top-3/4 left-1/4 w-3 h-3 bg-[#7d4bff]/30 rounded-full"></div>
      <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-[#b967ff]/40 rounded-full"></div>
      <div className="absolute top-2/3 left-1/3 w-5 h-5 bg-[#7d4bff]/20 rounded-full"></div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0" style={{ 
        backgroundImage: 'radial-gradient(circle, #b967ff05 1px, transparent 1px)',
        backgroundSize: '40px 40px' 
      }}></div>
    </div>
  );
};

export default BackgroundElements; 