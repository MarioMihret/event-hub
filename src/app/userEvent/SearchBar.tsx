"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, Loader } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "../events/hooks/useDebounce";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const debouncedSuggestionQuery = useDebounce(query, 300);
  const searchBarRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e?: React.FormEvent, suggestion?: string) => {
    if (e) e.preventDefault();
    const finalQuery = suggestion ?? query;
    setQuery(finalQuery);
    onSearch(finalQuery);
    setShowSuggestions(false);
    setSuggestions([]);
    setSuggestionError(null);
  };

  const clearSearch = () => {
    setQuery("");
    onSearch("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSuggestionError(null);
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSuggestionQuery.trim().length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoadingSuggestions(true);
      setShowSuggestions(true);
      setSuggestionError(null);
      try {
        const response = await fetch('/api/search-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: debouncedSuggestionQuery }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }

        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
        setSuggestionError("Could not load suggestions.");
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    if (isFocused) {
        fetchSuggestions();
    } else {
        setShowSuggestions(false);
    }
  }, [debouncedSuggestionQuery, isFocused]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchBarRef]);

  return (
    <motion.div 
      ref={searchBarRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto mb-6 relative"
    >
      <form onSubmit={handleSearch}>
        <motion.div 
          className={`relative flex items-center bg-[#120a19]/70 backdrop-blur-md border ${
            isFocused 
              ? "border-[#b967ff]/80 shadow-[0_0_20px_rgba(185,103,255,0.35)]" 
              : "border-[#b967ff]/20"
          } rounded-xl overflow-hidden transition-all duration-300`}
          animate={{ 
            scale: isFocused ? 1.02 : 1,
          }}
          whileHover={{ scale: 1.01, borderColor: "rgba(185, 103, 255, 0.5)" }}
        >
          <AnimatePresence>
            {isFocused && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  background: "linear-gradient(135deg, rgba(185, 103, 255, 0.08) 0%, rgba(41, 21, 71, 0.1) 100%)"
                }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none rounded-xl"
              />
            )}
          </AnimatePresence>
          
          <div className="pl-4">
            <motion.div
              animate={{ 
                scale: isFocused ? 1.1 : 1,
                color: isFocused ? "#b967ff" : "#6b7280" 
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Search className="h-5 w-5" />
            </motion.div>
          </div>
          
          <input
            type="text"
            placeholder="Search events by name, location or category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className="w-full py-4 px-3 bg-transparent text-white placeholder-gray-400 focus:outline-none text-base"
            autoComplete="off"
          />
          
          <AnimatePresence>
            {query && !isLoadingSuggestions && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={clearSearch}
                className="pr-4 text-gray-400 hover:text-white focus:outline-none transition-colors"
                whileHover={{ scale: 1.1, color: "#b967ff" }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="h-5 w-5" />
              </motion.button>
            )}
             {isLoadingSuggestions && (
                <div className="pr-4 pl-2">
                   <Loader className="h-5 w-5 text-[#b967ff] animate-spin" />
                </div>
            )}
          </AnimatePresence>
          
          <motion.button
            type="submit"
            className="bg-gradient-to-r from-[#b967ff] to-purple-700 text-white h-full px-6 ml-2 rounded-r-xl flex items-center justify-center font-medium relative overflow-hidden"
            whileHover={{ 
              scale: 1.05,
            }}
            whileTap={{ scale: 0.95 }}
            disabled={isLoadingSuggestions}
          >
            <AnimatePresence>
              {!isLoadingSuggestions && (
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear", repeatDelay: 0.5 }}
                />
              )}
            </AnimatePresence>
            
            <motion.span className="relative z-10">Search</motion.span>
          </motion.button>
        </motion.div>
      </form>

      <AnimatePresence>
        {showSuggestions && (suggestions.length > 0 || isLoadingSuggestions || suggestionError) && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-full mt-2 bg-[#1a1023]/90 backdrop-blur-sm border border-[#b967ff]/30 rounded-lg shadow-lg overflow-hidden"
          >
             {isLoadingSuggestions && suggestions.length === 0 && !suggestionError && (
                <li className="px-4 py-3 text-gray-400 text-sm flex items-center justify-center">
                   <Loader className="h-4 w-4 mr-2 animate-spin text-[#b967ff]" /> Fetching suggestions...
                </li>
             )}
             {suggestionError && (
                <li className="px-4 py-3 text-red-400 text-sm text-center">
                   {suggestionError}
                </li>
             )}
            {suggestions.map((suggestion, index) => (
              <motion.li
                key={index}
                onClick={() => handleSearch(undefined, suggestion)}
                className="px-4 py-3 text-white hover:bg-[#b967ff]/20 cursor-pointer transition-colors text-sm flex items-center"
                whileHover={{ 
                  backgroundColor: "rgba(185, 103, 255, 0.15)",
                  x: 5,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Search className="h-3.5 w-3.5 mr-2 text-[#b967ff]/70" />
                {suggestion}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SearchBar;
