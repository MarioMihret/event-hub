import React from 'react';
import { List, Grid, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface ViewControlsProps {
  viewMode: 'list' | 'grid' | 'calendar';
  onViewChange: (mode: 'list' | 'grid' | 'calendar') => void;
}

export function ViewControls({ viewMode, onViewChange }: ViewControlsProps) {
  // Define view options with labels and icons
  const viewOptions = [
    { id: 'list', label: 'List View', icon: List },
    { id: 'grid', label: 'Grid View', icon: Grid },
    { id: 'calendar', label: 'Calendar View', icon: Calendar },
  ] as const;

  return (
    <motion.div 
      className="flex items-center justify-center bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-0.5 rounded-lg shadow-inner"
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {viewOptions.map(({ id, label, icon: Icon }) => {
        const isActive = viewMode === id;
        
        return (
          <div key={id} className="relative group">
            {/* Tooltip that appears on hover */}
            <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 
                         transition-opacity duration-200 pointer-events-none z-10">
              <div className="bg-gray-900 text-gray-200 text-xs px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                {label}
              </div>
              <div className="border-t-4 border-l-4 border-r-4 border-transparent border-l-gray-900 w-1.5 h-1.5 transform rotate-45 translate-x-1/2 absolute -bottom-0.5 left-1/2"></div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onViewChange(id as 'list' | 'grid' | 'calendar')}
              className={`p-1.5 rounded-md transition-all duration-200 mx-0.5 ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/60 hover:text-white'
              }`}
              aria-label={label}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </motion.button>
          </div>
        );
      })}
    </motion.div>
  );
} 