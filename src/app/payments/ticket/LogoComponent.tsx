import React from 'react';

const LogoComponent: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-7 h-7 bg-[#7d4bff] rounded-full opacity-60 left-0 top-0"></div>
        <div className="absolute w-7 h-7 bg-[#b967ff] rounded-full opacity-70 left-2 top-0"></div>
        <div className="ml-4 text-white font-bold">
          <span className="text-sm mr-1">Event</span>
          <span className="text-[#b967ff] text-sm">Horizon</span>
        </div>
      </div>
    </div>
  );
};

export default LogoComponent; 