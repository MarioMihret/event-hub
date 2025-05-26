import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface FloatingTicketProps {
  children: ReactNode;
}

const FloatingTicket: React.FC<FloatingTicketProps> = ({ children }) => {
  return (
    <motion.div
      animate={{ 
        y: [0, -10, 0],
        boxShadow: [
          "0 25px 50px -12px rgba(185, 103, 255, 0.15)",
          "0 25px 50px -12px rgba(185, 103, 255, 0.25)",
          "0 25px 50px -12px rgba(185, 103, 255, 0.15)"
        ]
      }}
      transition={{
        repeat: Infinity,
        duration: 6,
        ease: "easeInOut"
      }}
      className="relative"
    >
      {children}
    </motion.div>
  );
};

export default FloatingTicket; 