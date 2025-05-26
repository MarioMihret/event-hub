import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  placeholder?: string;
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  placeholder = 'Search events...'
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the search box if there's an existing query
  useEffect(() => {
    if (searchQuery && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchQuery]);

  return (
    <motion.div 
      className={`relative flex-1 transition-all duration-200 rounded-lg overflow-hidden ${
        isFocused ? 'ring-1 ring-indigo-500/50 shadow-sm shadow-indigo-500/20' : ''
      }`}
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 transition-all duration-200">
        <Search className={`w-4 h-4 ${isFocused ? 'text-indigo-400' : 'text-gray-500'}`} />
      </div>
      
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full pl-10 pr-8 py-2.5 bg-gray-800/70 hover:bg-gray-800/90 border border-gray-700/70 hover:border-gray-600 
                text-white text-sm placeholder-gray-500 focus:outline-none focus:bg-gray-800 transition-all rounded-lg"
        aria-label="Search events"
      />
      
      <AnimatePresence>
        {searchQuery && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded-full
                      bg-gray-700/50 hover:bg-gray-700 transition-all"
            onClick={onClearSearch}
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 