import { FC, useState, useEffect } from 'react';
import { User } from 'next-auth';
import { motion } from 'framer-motion';
import { UserAvatar } from './UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/app/components/auth/UserProvider';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  image?: string | null;
  bio?: string;
  googleName?: string;
  customImage?: string;
}

interface UserInfoProps {
  user: User;
  showBio?: boolean;
  refreshTrigger?: number;
  variant?: 'default' | 'compact' | 'card';
  className?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export const UserInfo: FC<UserInfoProps> = ({ 
  user, 
  showBio = false, 
  refreshTrigger = 0, 
  variant = 'default',
  className = '',
  isActive = false,
  onClick
}) => {
  const { user: userProfile, refreshUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch if there's no userProfile yet or if refreshTrigger changes
    if (!userProfile || refreshTrigger > 0) {
      const fetchProfile = async () => {
        try {
          setLoading(true);
          setError(null);
          
          if (!userProfile) {
            await refreshUser();
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
          setError('Could not load profile information');
        } finally {
          setLoading(false);
        }
      };
      
      fetchProfile();
    } else {
      // If we already have a profile, just set loading to false
      setLoading(false);
    }
  }, [refreshTrigger, userProfile, refreshUser]); // Add refreshUser back as it's used inside

  // Determine sizes and layouts based on variant
  const config = {
    default: {
      container: "flex items-center space-x-3",
      avatarSize: showBio ? "lg" : "md",
      nameClass: "font-medium text-white",
      bioClass: "text-sm text-gray-400 mt-1"
    },
    compact: {
      container: "flex items-center space-x-2",
      avatarSize: "sm",
      nameClass: "text-sm font-medium text-white",
      bioClass: "text-xs text-gray-400 mt-0.5"
    },
    card: {
      container: "flex flex-col items-center text-center",
      avatarSize: "xl",
      nameClass: "font-medium text-white mt-3",
      bioClass: "text-sm text-gray-400 mt-2"
    }
  };

  const { container, avatarSize, nameClass, bioClass } = config[variant];

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        className={`${container} ${className}`}
      >
        {variant === 'card' ? (
          <div className="flex flex-col items-center space-y-3">
            <Skeleton className="w-24 h-24 rounded-full bg-[#2D1D3A]/60" />
            <Skeleton className="h-4 w-20 bg-[#2D1D3A]/60" />
            {showBio && <Skeleton className="h-3 w-32 bg-[#2D1D3A]/60" />}
          </div>
        ) : (
          <>
            <Skeleton className={`rounded-full bg-[#2D1D3A]/60 ${
              avatarSize === 'sm' ? 'w-8 h-8' : avatarSize === 'lg' ? 'w-16 h-16' : 'w-10 h-10'
            }`} />
            <div className="space-y-2">
              <Skeleton className="h-4 bg-[#2D1D3A]/60 rounded w-24" />
              {showBio && <Skeleton className="h-3 bg-[#2D1D3A]/60 rounded w-32" />}
            </div>
          </>
        )}
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`${container} ${className}`}
      >
        <UserAvatar 
          user={user} 
          size={avatarSize as any} 
          refreshTrigger={refreshTrigger}
          isActive={isActive}
        />
        <div>
          <p className={nameClass}>{user.name}</p>
          {showBio && <p className="text-sm text-red-400">Error loading profile</p>}
        </div>
      </motion.div>
    );
  }

  const containerWithClick = onClick ? `${container} ${className} cursor-pointer hover:bg-[#2D1D3A]/30 rounded-lg p-2 transition-all duration-200` : `${container} ${className}`;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={containerWithClick}
      onClick={onClick}
    >
      {variant === 'card' ? (
        <>
          <UserAvatar 
            user={user} 
            size={avatarSize as any} 
            refreshTrigger={refreshTrigger}
            isActive={isActive}
            className="mb-2"
          />
          <div>
            <p className={nameClass}>{userProfile?.name || user.name}</p>
            {showBio && (
              <p className={bioClass}>
                {userProfile?.bio || "No bio available"}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <UserAvatar 
            user={user} 
            size={avatarSize as any} 
            refreshTrigger={refreshTrigger}
            isActive={isActive}
          />
          <div>
            <p className={nameClass}>{userProfile?.name || user.name}</p>
            {showBio && (
              <p className={bioClass}>
                {userProfile?.bio || "No bio available"}
              </p>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}; 