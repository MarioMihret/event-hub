"use client";

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation'; // Using next/navigation for App Router

/**
 * Manages session effects, primarily to detect if a user's account
 * has become inactive (suspended) and then signs them out.
 */
export function SessionEffectManager() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only act if the session is authenticated and we have user data
    if (status === 'authenticated' && session?.user) {
      const userIsActive = session.user.isActive;
      const sessionError = (session.user as any).error; // Access potential error from JWT

      // Check if the account is marked as inactive or if there was a critical error during JWT validation
      if (userIsActive === false || sessionError === "UserNotFoundInDB" || sessionError === "DbFetchError") {
        console.warn(
          `[SessionEffectManager] User account inactive or error. isActive: ${userIsActive}, error: ${sessionError}. Signing out.`
        );
        
        // Avoid redirect loops if already on an auth page or the suspended page
        const authPaths = ['/auth/signin', '/auth/signup', '/account-suspended']; // Add any other relevant public auth paths for Project B
        if (authPaths.includes(pathname)) {
          return;
        }

        // Show a brief message (optional, consider a toast notification library for better UX)
        alert(
          sessionError === "UserNotFoundInDB" || sessionError === "DbFetchError" 
          ? "Your session is no longer valid. Please sign in again."
          : "Your account has been suspended or is inactive. You will be signed out."
        );

        // Sign out and redirect to sign-in page with an error query parameter
        signOut({
          callbackUrl: `/auth/signin?error=${sessionError === "UserNotFoundInDB" || sessionError === "DbFetchError" ? "SessionInvalidated" : "AccountSuspended"}`,
          redirect: true,
        });
      }
    }
  }, [session, status, router, pathname]);

  // This component does not render anything itself
  return null;
} 