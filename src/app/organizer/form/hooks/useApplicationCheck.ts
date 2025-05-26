// app/form/hooks/useApplicationCheck.ts
"use client";

import { useState, useEffect } from "react";
import { Session } from "next-auth";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface ApplicationCheckStatus {
  isChecking: boolean;
  status: string;
  progress: number;
  error: string | null;
}

export default function useApplicationCheck(
  session: Session | null,
  authStatus: string,
  router: AppRouterInstance
) {
  const [checkStatus, setCheckStatus] = useState<ApplicationCheckStatus>({
    isChecking: true,
    status: "Initializing application check...",
    progress: 0,
    error: null
  });

  useEffect(() => {
    const checkExistingApplication = async () => {
      if (authStatus === 'loading') {
        setCheckStatus(prev => ({
          ...prev,
          status: "Authenticating your session...",
          progress: 10
        }));
        return;
      }

      if (!session?.user?.email) {
        setCheckStatus(prev => ({
          ...prev,
          status: "No active session found. Redirecting to login...",
          progress: 100,
          error: "Authentication required"
        }));
        router.push('/auth/signin');
        return;
      }

      try {
        setCheckStatus(prev => ({
          ...prev,
          status: "Connecting to application database...",
          progress: 30
        }));

        // Reduced delay to make UI feel more responsive
        await new Promise(resolve => setTimeout(resolve, 300));

        setCheckStatus(prev => ({
          ...prev,
          status: "Searching for existing applications...",
          progress: 60
        }));

        // Check if user has an existing application
        const response = await fetch('/api/organizer-applications/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.exists) {
          // If application exists, redirect to status page
          setCheckStatus(prev => ({
            ...prev,
            status: "Application found! Redirecting to status page...",
            progress: 100
          }));
          
          // Reduced delay
          await new Promise(resolve => setTimeout(resolve, 300));
          router.replace(`/organizer/status/${data.applicationId}`);
          return;
        }

        // If no existing application, allow form access
        setCheckStatus(prev => ({
          ...prev,
          status: "Ready to start your application",
          progress: 100,
          isChecking: false
        }));
      } catch (error) {
        console.error('Error checking application status:', error);
        setCheckStatus(prev => ({
          ...prev,
          status: "Error checking application status",
          progress: 100,
          isChecking: false,
          error: error instanceof Error ? error.message : "Unknown error"
        }));
      }
    };

    checkExistingApplication();
  }, [session, authStatus, router]);

  return checkStatus;
}