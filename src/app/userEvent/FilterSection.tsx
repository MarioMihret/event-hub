"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Check, ChevronDown, Calendar, MapPin, DollarSign, Tag } from "lucide-react";

// Define color scheme constants
const COLORS = {
  darkPurple: '#120a19',
  brightPurple: '#b967ff',
  mediumPurple: '#9146FF',
  lightPurple: '#d4a7ff',
  black: '#000000',
  white: '#ffffff',
};

interface FilterOption {
  id: string;
  name: string;
}

interface FilterSectionProps {
  categories: FilterOption[];
  locations: FilterOption[];
  priceRanges: FilterOption[];
  dates: FilterOption[];
  onFilterChange: (filterType: string, selectedIds: string[]) => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  categories,
  locations,
  priceRanges,
  dates,
  onFilterChange,
}) => {
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({
    categories: [],
    locations: [],
    priceRanges: [],
    dates: [],
  });

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleFilterToggle = (filterType: string, optionId: string) => {
    setActiveFilters((prev) => {
      const currentFilters = [...prev[filterType]];
      
      // If filter is already active, remove it, otherwise add it
      const index = currentFilters.indexOf(optionId);
      if (index === -1) {
        currentFilters.push(optionId);
      } else {
        currentFilters.splice(index, 1);
      }
      
      // Call the parent component callback with updated filters
      onFilterChange(filterType, currentFilters);
      
      return {
        ...prev,
        [filterType]: currentFilters,
      };
    });
  };

  const handleSectionToggle = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getActiveFilterCount = () => {
    return Object.values(activeFilters).reduce(
      (total, filters) => total + filters.length, 
      0
    );
  };

  // Animation variants
  const filterContainerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        staggerChildren: 0.05,
        delayChildren: 0.1,
      }
    },
  };

  const filterItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };

  const dropdownVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: { 
      height: "auto", 
      opacity: 1,
      transition: { 
        height: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 } 
      }
    },
    exit: { 
      height: 0, 
      opacity: 0,
      transition: { 
        height: { duration: 0.2 },
        opacity: { duration: 0.1 } 
      }
    }
  };
  
  // New animation for checkbox
  const checkboxVariants = {
    unchecked: { 
      backgroundColor: "rgba(185, 103, 255, 0.0)",
      borderColor: "rgba(185, 103, 255, 0.3)",
    },
    checked: { 
      backgroundColor: "rgba(185, 103, 255, 1)",
      borderColor: "rgba(185, 103, 255, 1)",
      transition: { type: "spring", stiffness: 500, damping: 30 }
    }
  };

  const checkIconVariants = {
    hidden: { opacity: 0, scale: 0.5, pathLength: 0 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      pathLength: 1,
      transition: { duration: 0.2, delay: 0.1 } 
    }
  };

  // Filter sections data
  const filterSections = [
    {
      id: "categories",
      title: "Categories",
      icon: <Tag className="w-4 h-4" />,
      options: categories,
    },
    {
      id: "locations",
      title: "Locations",
      icon: <MapPin className="w-4 h-4" />,
      options: locations,
    },
    {
      id: "priceRanges",
      title: "Price Ranges",
      icon: <DollarSign className="w-4 h-4" />,
      options: priceRanges,
    },
    {
      id: "dates",
      title: "Dates",
      icon: <Calendar className="w-4 h-4" />,
      options: dates,
    },
  ];

  const activeFilterCount = getActiveFilterCount();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8"
    >
      <div className="flex flex-col space-y-6">
        {/* Filter header */}
        <div className="flex items-center justify-between bg-[#1A0D25]/70 backdrop-blur-md p-4 rounded-xl border border-[#b967ff]/20">
          <motion.div 
            className="flex items-center gap-3 text-white font-medium"
            whileHover={{ scale: 1.02 }}
          >
            <motion.div 
              animate={{ 
                rotate: activeFilterCount > 0 ? [0, 15, 0] : 0,
                scale: activeFilterCount > 0 ? [1, 1.1, 1] : 1,
              }}
              transition={{ 
                duration: 0.5,
                times: [0, 0.5, 1],
                repeat: activeFilterCount > 0 ? 0 : undefined,
              }}
              className="p-2 bg-[#b967ff]/10 rounded-full"
            >
              <Filter className="w-5 h-5 text-[#b967ff]" />
            </motion.div>
            <div>
              <span className="font-semibold text-lg">Filter Events</span>
              <p className="text-sm text-gray-400">Refine your search with these filters</p>
            </div>
            
            {activeFilterCount > 0 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-[#b967ff] text-white text-xs font-bold ml-2"
              >
                {activeFilterCount}
              </motion.div>
            )}
          </motion.div>
          
          {activeFilterCount > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ 
                scale: 1.05,
                backgroundColor: "rgba(185, 103, 255, 0.15)"
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const emptyFilters = Object.keys(activeFilters).reduce(
                  (acc, key) => ({ ...acc, [key]: [] }),
                  {} as Record<string, string[]>
                );
                setActiveFilters(emptyFilters);
                
                // Call the parent callback for each filter type
                Object.keys(emptyFilters).forEach(filterType => {
                  onFilterChange(filterType, []);
                });
              }}
              className="text-sm text-[#b967ff] font-medium border border-[#b967ff]/30 rounded-lg py-2 px-4 transition-all duration-200 hover:shadow-[0_0_10px_rgba(185,103,255,0.2)]"
            >
              Clear all filters
            </motion.button>
          )}
        </div>

        {/* Filter sections */}
        <motion.div 
          variants={filterContainerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {filterSections.map((section) => (
            <motion.div 
              key={section.id}
              variants={filterItemVariants}
              className={`bg-[#120a19]/70 backdrop-blur-sm border ${
                activeFilters[section.id].length > 0 
                  ? "border-[#b967ff]/50" 
                  : "border-[#b967ff]/10"
              } rounded-xl overflow-hidden transition-all duration-300 shadow-lg ${
                expandedSection === section.id ? "shadow-[#b967ff]/10" : ""
              }`}
              whileHover={{ 
                y: -3,
                boxShadow: "0 10px 25px -5px rgba(185, 103, 255, 0.15)",
                borderColor: "rgba(185, 103, 255, 0.4)"
              }}
            >
              <motion.button
                whileHover={{ backgroundColor: "rgba(185, 103, 255, 0.1)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSectionToggle(section.id)}
                className={`w-full flex items-center justify-between p-4 text-white ${
                  expandedSection === section.id ? "bg-gradient-to-r from-[#b967ff]/10 via-[#b967ff]/5 to-transparent" : ""
                }`}
                aria-expanded={expandedSection === section.id}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    activeFilters[section.id].length > 0 
                      ? "bg-[#b967ff]/20 text-[#b967ff]" 
                      : "bg-[#2A1151]/30 text-gray-400"
                  } transition-all duration-300`}>
                    {section.icon}
                  </div>
                  <span className="font-medium tracking-wide">{section.title}</span>
                  
                  {activeFilters[section.id].length > 0 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center justify-center w-5 h-5 rounded-full bg-[#b967ff] text-white text-xs font-bold shadow-md shadow-[#b967ff]/20"
                    >
                      {activeFilters[section.id].length}
                    </motion.div>
                  )}
                </div>

                <motion.div
                  animate={{ 
                    rotate: expandedSection === section.id ? 180 : 0,
                    backgroundColor: expandedSection === section.id ? "rgba(185, 103, 255, 0.2)" : "transparent",
                  }}
                  transition={{ duration: 0.3 }}
                  className={`p-1 rounded-full ${expandedSection === section.id ? "text-[#b967ff]" : "text-gray-400"}`}
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </motion.button>
              
              <AnimatePresence>
                {expandedSection === section.id && (
                  <motion.div
                    key={`${section.id}-content`}
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {section.options.map((option) => {
                        const isActive = activeFilters[section.id].includes(option.id);
                        
                        return (
                          <motion.button
                            key={option.id}
                            whileHover={{ 
                              backgroundColor: isActive ? "rgba(185, 103, 255, 0.3)" : "rgba(255, 255, 255, 0.05)",
                              x: 2
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleFilterToggle(section.id, option.id)}
                            className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-all duration-200 ${
                              isActive 
                                ? "bg-[#b967ff]/20 text-white" 
                                : "text-gray-300 hover:text-white"
                            }`}
                          >
                            <span className="text-sm font-medium">{option.name}</span>
                            
                            <div className="relative">
                              <motion.div
                                animate={isActive ? "checked" : "unchecked"}
                                variants={checkboxVariants}
                                className="w-5 h-5 rounded-md border-2 flex items-center justify-center overflow-hidden"
                              >
                                <AnimatePresence>
                                  {isActive && (
                                    <motion.div
                                      initial={{ pathLength: 0, opacity: 0 }}
                                      animate={{ pathLength: 1, opacity: 1 }}
                                      exit={{ pathLength: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <Check className="w-3 h-3 text-white stroke-[3]" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                              
                              {/* Ripple effect when selected */}
                              <AnimatePresence>
                                {isActive && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0.5 }}
                                    animate={{ scale: 2, opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0 bg-[#b967ff]/40 rounded-full"
                                    style={{ originX: 0.5, originY: 0.5 }}
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default FilterSection;
