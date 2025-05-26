"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Calendar, Menu, X, Search, Settings, LogOut, PlusCircle, LayoutDashboard } from 'lucide-react';
import { UserAvatar } from '@/components/User/UserAvatar';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to check if URL is from external sources that need unoptimized handling
const isExternalImageUrl = (url: string) => {
  if (!url) return false;
  return url.includes('googleusercontent.com') || 
         url.includes('api.dicebear.com') || 
         url.includes('i.pravatar.cc') || 
         url.includes('images.unsplash.com') ||
         url.includes('github.com');
};

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Create refs for dropdown menu elements
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileAvatarRef = useRef<HTMLDivElement>(null);
  
  // Check if current page is an auth page
  const isAuthPage = pathname?.startsWith('/auth');
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

  // Listen for storage events and custom events that indicate profile changes
  useEffect(() => {
    if (isAuthPage) return; // Skip effect for auth pages
    
    const handleStorageChange = (event) => {
      if (event.key === 'profile_updated') {
        setProfileVersion(prev => prev + 1);
      }
    };
    
    const handleCustomEvent = () => {
      setProfileVersion(prev => prev + 1);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profile_updated', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profile_updated', handleCustomEvent);
    };
  }, [isAuthPage]);

  // Detect scroll
  useEffect(() => {
    if (isAuthPage) return; // Skip effect for auth pages
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAuthPage]);

  // Monitor online status
  useEffect(() => {
    if (isAuthPage) return; // Skip effect for auth pages
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthPage]);

  // Define Navigation Links Conditionally
  const commonLinks = [
    { href: '/', label: 'Home' },
    { href: '/events', label: 'Events' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  const authenticatedLinks = [
    ...commonLinks.slice(0, 2), // Home, Events
    { href: '/organizer', label: 'Organizer', icon: LayoutDashboard },
    ...commonLinks.slice(2), // About, Contact
  ];

  const unauthenticatedLinks = commonLinks;

  const navLinks = isAuthenticated ? authenticatedLinks : unauthenticatedLinks;

  // NEW NavLinkItem component
  const NavLinkItem = ({ href, label }: { href: string; label: string }) => {
    const currentPathname = usePathname();
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
      setIsActive(currentPathname === href);
    }, [currentPathname, href]);

    return (
      <Link
        href={href}
        className={`transition-colors duration-200 hover:text-purple-300 py-2 text-xs lg:text-sm ${
          isActive ? 'text-purple-300 font-semibold' : 'text-gray-400 font-medium'
        }`}
      >
        {label}
      </Link>
    );
  };

  const handleClear = () => {
    setQuery('');
  };

  // Toggle profile dropdown menu
  const handleProfileClick = () => {
    setShowProfileMenu(prev => !prev);
  };

  // Handle navigation to settings
  const handleSettingsClick = () => {
    setShowProfileMenu(false);
    setIsMobileMenuOpen(false);
    router.push('/settings');
  };

  // Handle logout
  const handleLogout = async () => {
    setShowProfileMenu(false);
    setIsMobileMenuOpen(false);
    await signOut({ callbackUrl: '/' });
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProfileMenu) {
        // Check if click is outside both desktop and mobile menus
        const isOutsideDesktopMenu = menuRef.current && !menuRef.current.contains(event.target as Node);
        const isOutsideDesktopAvatar = avatarRef.current && !avatarRef.current.contains(event.target as Node);
        const isOutsideMobileMenu = mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node);
        const isOutsideMobileAvatar = mobileAvatarRef.current && !mobileAvatarRef.current.contains(event.target as Node);
        
        // Close menu if click is outside both desktop and mobile elements
        if (
          (isOutsideDesktopMenu && isOutsideDesktopAvatar) && 
          (isOutsideMobileMenu && isOutsideMobileAvatar)
        ) {
          setShowProfileMenu(false);
        }
      }
    };

    // Only add listener if menu is showing
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  // If we're on an auth page, don't render the navbar
  if (isAuthPage) {
    return null;
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || isMobileMenuOpen 
          ? 'bg-black text-white shadow-lg backdrop-blur-md'
          : 'bg-transparent text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand Name */}
          <Link href="/" className="flex items-center gap-1 sm:gap-2 group">
            <motion.div whileHover={{ rotate: 15 }} transition={{ type: "spring", stiffness: 300 }}>
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-[#b967ff] group-hover:scale-110 transition-transform" />
            </motion.div>
            <span className="text-lg sm:text-xl font-bold">EventHub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <div className="flex space-x-3 lg:space-x-5">
              {navLinks.map((link) => (
                <NavLinkItem key={link.href} href={link.href} label={link.label} />
              ))}
            </div>

            {/* Search Bar */}
            <div className={`relative group ${isFocused ? 'w-40 lg:w-56' : 'w-32 lg:w-40'} transition-all duration-300`}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-hover:text-purple-300 transition-colors" />
              
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Search..."
                className="w-full pl-9 pr-8 py-1.5 bg-[#1a1a2e]/60 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-700/50 focus:ring-1 focus:ring-purple-700/50 transition-all"
              />

              {query && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center">
              {isLoading ? (
                <div className="w-24 h-8 bg-gray-700/50 rounded-md animate-pulse"></div>
              ) : isAuthenticated ? (
                <div className="relative">
                  <motion.div
                    ref={avatarRef}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleProfileClick}
                    className="cursor-pointer relative"
                  >
                    <UserAvatar 
                      user={session.user} 
                      size="md" 
                      showBorder={true}
                      refreshTrigger={profileVersion}
                    />
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#120a19]">
                      </div>
                    )}
                  </motion.div>
                  
                  {/* Profile dropdown menu */}
                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div 
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 origin-top-right bg-[#100818] border border-purple-700/30 rounded-lg shadow-xl overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-purple-700/30">
                          <p className="text-sm text-white font-semibold truncate">{session.user.name || 'User'}</p>
                          <p className="text-xs text-gray-400 truncate">{session.user.email || 'No email'}</p>
                        </div>
                        <div className="py-1">
                          <button 
                            onClick={handleSettingsClick}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-purple-800/40 hover:text-white transition-colors"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                          </button>
                          <button 
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-800/40 hover:text-red-300 transition-colors"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => signIn()}
                    className="px-3 py-1.5 text-xs lg:text-sm font-medium text-gray-300 hover:text-white bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700/50 rounded-md transition-colors"
                  >
                    Sign In
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/auth/signup')}
                    className="px-3 py-1.5 text-xs lg:text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 rounded-md transition-all shadow-md hover:shadow-purple-500/20"
                  >
                    Sign Up
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? <X className="block h-6 w-6" aria-hidden="true" /> : <Menu className="block h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden absolute top-16 left-0 right-0 bg-[#100818] border-t border-purple-700/30 shadow-lg"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <NavLinkItem key={link.href} href={link.href} label={link.label} />
              ))}
            </div>
            {/* Mobile Auth Section */}
            <div className="pt-4 pb-3 border-t border-purple-700/30">
              {isLoading ? (
                 <div className="px-5">
                   <div className="h-10 bg-gray-700/50 rounded animate-pulse w-3/4"></div>
                 </div>
              ) : isAuthenticated ? (
                // Authenticated: User Info and Actions
                <div className="px-5">
                  <div className="flex items-center mb-3">
                    <div ref={mobileAvatarRef} onClick={handleProfileClick} className="flex-shrink-0 mr-3 cursor-pointer">
                      <UserAvatar user={session.user} size="lg" showBorder={true} refreshTrigger={profileVersion} />
                    </div>
                    <div>
                      <div className="text-base font-medium text-white truncate">{session.user.name || 'User'}</div>
                      <div className="text-sm font-medium text-gray-400 truncate">{session.user.email || 'No email'}</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <button
                      onClick={handleSettingsClick}
                      className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-purple-800/30 hover:text-white transition-colors"
                    >
                       <Settings className="w-5 h-5 mr-2 text-gray-400" />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-red-800/40 hover:text-red-300 transition-colors"
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                // Unauthenticated: Sign In / Sign Up Buttons
                <div className="px-5 space-y-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { signIn(); setIsMobileMenuOpen(false); }}
                    className="block w-full text-center px-3 py-2 rounded-md text-base font-medium text-white bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 transition-all shadow-md"
                  >
                    Sign In
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { router.push('/auth/signup'); setIsMobileMenuOpen(false); }}
                    className="block w-full text-center px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700/50 transition-colors"
                  >
                    Sign Up
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
