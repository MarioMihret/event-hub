import { FC, useState, useEffect } from 'react';
import Image from 'next/image';
import { UserCircle } from 'lucide-react';
import { User } from 'next-auth';
import { motion } from 'framer-motion';
import { useUser } from '@/app/components/auth/UserProvider';

// Helper function to check if URL is from external sources that need unoptimized handling
const isExternalImageUrl = (url: string) => {
  if (!url) return false;
  return url.includes('googleusercontent.com') || 
         url.includes('api.dicebear.com') || 
         url.includes('i.pravatar.cc') || 
         url.includes('images.unsplash.com') ||
         url.includes('githubusercontent.com');
};

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  image?: string | null;
  bio?: string;
  customImage?: string;
}

interface UserAvatarProps {
  user: User;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
  refreshTrigger?: number;
  isActive?: boolean;
  className?: string;
  onClick?: () => void;
}

export const UserAvatar: FC<UserAvatarProps> = ({ 
  user, 
  size = 'md', 
  showBorder = true,
  refreshTrigger = 0,
  isActive = false,
  className = "",
  onClick
}) => {
  const { user: userProfile, refreshUser } = useUser();
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Only fetch if userProfile is not available or refreshTrigger changes
    if (!userProfile || refreshTrigger > 0) {
      const fetchProfileImage = async () => {
        try {
          setLoading(true);
          if (!userProfile) {
            await refreshUser();
          }
        } catch (error) {
          console.error('Error fetching profile image:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchProfileImage();
    } else {
      // If we already have a profile, just set loading to false
      setLoading(false);
    }
  }, [refreshTrigger, userProfile, refreshUser]);
  
  const sizeMap = {
    xs: { width: 24, height: 24, iconSize: 'w-6 h-6' },
    sm: { width: 32, height: 32, iconSize: 'w-8 h-8' },
    md: { width: 40, height: 40, iconSize: 'w-10 h-10' },
    lg: { width: 64, height: 64, iconSize: 'w-16 h-16' },
    xl: { width: 96, height: 96, iconSize: 'w-24 h-24' }
  };
  
  const { width, height, iconSize } = sizeMap[size];

  // Use profile image if available, otherwise use the user's original image
  const imageUrl = userProfile?.customImage || user?.image;

  const containerClasses = `relative overflow-hidden rounded-full transition-all duration-300 ${
    showBorder ? isActive 
      ? 'ring-2 ring-[#b967ff] ring-offset-1 ring-offset-[#120a19]' 
      : 'border-2 border-[#b967ff]/60' 
    : ''
  } ${className} ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`;

  if (loading) {
    return (
      <div 
        className={`${containerClasses} bg-[#2D1D3A]/60 animate-pulse`}
        style={{ width, height }}
      />
    );
  }

  if (imageError || !imageUrl) {
    return (
      <div
        className={containerClasses}
        style={{ width, height }}
        onClick={onClick}
      >
        <div className="flex items-center justify-center w-full h-full bg-[#2D1D3A]">
          <UserCircle className={`${iconSize} text-[#b967ff]/60`} />
        </div>
        {isActive && (
          <motion.div 
            className="absolute inset-0 rounded-full ring-2 ring-[#b967ff]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className={containerClasses}
      style={{ width, height }}
      onClick={onClick}
    >
      <Image
        src={imageUrl}
        alt={`${user.name || 'User'}'s profile`}
        width={width}
        height={height}
        className="rounded-full object-cover w-full h-full"
        onError={() => setImageError(true)}
        priority
        unoptimized={isExternalImageUrl(imageUrl)}
      />
      {isActive && (
        <motion.div 
          className="absolute inset-0 rounded-full ring-2 ring-[#b967ff]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
      )}
      <div className="absolute inset-0 rounded-full shadow-inner" />
    </div>
  );
}; 