import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Hook that periodically checks if the current user's account has been suspended
 */
export const useAccountStatusCheck = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const statusCheckInterval = 30000; // Check every 30 seconds

  useEffect(() => {
    if (!session?.user?.email) return;

    // Perform an initial check
    checkAccountStatus(session.user.email);
    
    // Set up periodic checks
    const timer = setInterval(() => {
      checkAccountStatus(session.user.email);
    }, statusCheckInterval);
    
    return () => clearInterval(timer);
  }, [session?.user?.email]);

  const checkAccountStatus = async (email: string) => {
    try {
      // Add cache busting parameter to prevent caching
      const response = await fetch(`/api/users/status?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (data.isActive === false) {
        // Account has been suspended, redirect to suspended page
        router.push('/account-suspended');
      }
    } catch (error) {
      console.error("Error checking account status:", error);
    }
  };
}; 