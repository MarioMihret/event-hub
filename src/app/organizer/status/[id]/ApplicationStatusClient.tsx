"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { clearApplicationData, getApplicationData } from '@/lib/utils/applicationUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { NoiseBackground } from '@/app/components/NoiseBackground';

interface ApplicationStatusClientProps {
  applicationId: string;
}

const ApplicationStatusClient = ({ applicationId }: ApplicationStatusClientProps) => {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [status, setStatus] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const checkApplicationStatus = useCallback(async (appId: string) => {
    try {
      console.log("Checking status for application:", appId);
      setRefreshing(true);
      
      // Save the application ID we're checking
      localStorage.setItem("applicationId", appId);
      
      const response = await fetch(`/api/organizer-applications/status/${appId}`);
      
      // Handle non-OK responses before trying to parse JSON
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Application not found. Please submit a new application.");
        } else {
          const errorData = await response.json().catch(() => ({
            error: `Server returned ${response.status}: ${response.statusText}`
          }));
          if (response.status === 403) {
            throw new Error(errorData.error || "Access Denied. Please ensure you are logged in with the correct account.");
          }
          throw new Error(errorData.error || `Failed to fetch application status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      console.log("Status response:", data);

      if (data.success) {
        // Store status and feedback for persistence
        localStorage.setItem("applicationStatus", data.data.status);
        localStorage.setItem("applicationFeedback", data.data.feedback || "");
        
        setStatus(data.data.status);
        setFeedback(data.data.feedback || "");
        setError(null);
        setLastUpdated(new Date());

        // Handle different statuses
        switch (data.data.status) {
          case "accepted":
            console.log("Application accepted. Checking subscription status...");
            
            // Added: Check subscription status before redirecting
            try {
              if (!session?.user?.email) {
                throw new Error("User email not found in session");
              }
              const subResponse = await fetch('/api/subscriptions/check', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache' // Ensure fresh check
                },
                body: JSON.stringify({ email: session.user.email }),
              });
              
              const subData = await subResponse.json();
              console.log("Subscription check result:", subData);

              if (!subResponse.ok) {
                throw new Error(subData.error || "Failed to check subscription status");
              }

              const isActive = subData.success && subData.hasSubscription && subData.status === 'active';
              const redirectPath = isActive ? '/organizer/create' : '/organizer/subscribe';
              const redirectMessage = isActive ? "Redirecting to event creation..." : "Redirecting to subscription page...";
              
              console.log(redirectMessage);
              setTimeout(() => {
                router.push(redirectPath);
              }, 1500); // Delay to show acceptance message

            } catch (subError) {
              console.error("Subscription check failed:", subError);
              setError(subError instanceof Error ? subError.message : "Failed to verify subscription");
              // Optionally redirect to an error page or show error prominently
              // For now, maybe just stay on the status page with the error
              setLoading(false); // Ensure loading stops if check fails
              setRefreshing(false);
            }
            break;
          case "rejected":
            setTimeout(() => {
              clearApplicationData();
              router.push('/organizer/form');
            }, 5000);
            break;
        }
      } else {
        throw new Error(data.error || "Failed to fetch application status");
      }
    } catch (err) {
      console.error("Status check error:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch application status';
      setError(errorMessage);
      
      // If application not found, redirect to the form after a delay
      if (errorMessage.includes("Application not found")) {
        setTimeout(() => {
          clearApplicationData();
          router.push('/organizer/form');
        }, 3000);
      }
      
      setStatus(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, session]);

  useEffect(() => {
    if (authStatus === 'loading') return;

    if (!session) {
      console.log("No session found, redirecting to signin");
      router.push('/auth/signin');
      return;
    }

    const initializeStatus = async () => {
      try {
        console.log("Initializing status check...");
        
        // Check if the applicationId from route params is valid ObjectId format
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(applicationId);
        if (applicationId && !isValidObjectId) {
          console.log(`Invalid ObjectId format: ${applicationId}`);
          setError('Invalid application ID format. Please submit a new application.');
          setLoading(false);
          
          setTimeout(() => {
            clearApplicationData();
            router.push('/organizer/form');
          }, 3000);
          return;
        }
        
        if (!applicationId) {
          console.log("No application ID found in route params");
          
          // Check if we have a stored application ID in localStorage as fallback
          const appData = getApplicationData();
          if (appData?.applicationId) {
            console.log("Found application ID in localStorage:", appData.applicationId);
            
            // If we're on the status page but with no ID, redirect to the correct ID
            if (window.location.pathname.includes('/organizer/status/')) {
              router.push(`/organizer/status/${appData.applicationId}`);
              return;
            }
            
            await checkApplicationStatus(appData.applicationId);
            return;
          }
          
          setError('No application ID provided');
          setLoading(false);
          
          // Redirect to form after delay if no application ID is found
          setTimeout(() => {
            clearApplicationData();
            router.push('/organizer/form');
          }, 3000);
          return;
        }

        await checkApplicationStatus(applicationId);
      } catch (err) {
        console.error("Status initialization error:", err);
        setError('Failed to validate application status');
        setLoading(false);
      }
    };

    initializeStatus();
  }, [session, authStatus, router, applicationId, checkApplicationStatus]);

  useEffect(() => {
    if (status === "pending") {
      const timer = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 60000); // Update every minute

      // Auto-refresh every 5 minutes
      const refreshTimer = setInterval(() => {
        if (applicationId) checkApplicationStatus(applicationId);
      }, 300000);

      return () => {
        clearInterval(timer);
        clearInterval(refreshTimer);
      };
    }
  }, [status, applicationId, checkApplicationStatus]);

  const formatTimeElapsed = (minutes: number) => {
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'} ${remainingMinutes > 0 ? `and ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}` : ''}`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    return `${days} day${days === 1 ? '' : 's'} ${remainingHours > 0 ? `and ${remainingHours} hour${remainingHours === 1 ? '' : 's'}` : ''}`;
  };

  const getStatusDisplay = () => {
    if (error) {
      // Special case for application not found
      if (error.includes("Application not found")) {
        return {
          icon: <AlertCircle className="h-12 w-12 text-yellow-500" />,
          title: "Application Not Found",
          message: "We couldn't find your application. You'll be redirected to the application form shortly.",
          showSubmitButton: true,
          showRefreshButton: false,
          showDebugButton: true
        };
      }
      
      return {
        icon: <AlertCircle className="h-12 w-12 text-purple-500" />,
        title: "Error Fetching Status",
        message: error,
        showSubmitButton: true,
        showRefreshButton: false,
        showDebugButton: true
      };
    }
    switch (status) {
      case "pending":
        return {
          icon: <Clock className="h-12 w-12 text-yellow-500" />,
          title: "Application Under Review",
          message: `Your application is currently being reviewed. It has been ${formatTimeElapsed(timeElapsed)} since submission.`,
          subMessage: lastUpdated ? `Last checked: ${lastUpdated.toLocaleTimeString()} on ${lastUpdated.toLocaleDateString()}` : '',
          showSubmitButton: false,
          showRefreshButton: true
        };
      case "accepted":
        return {
          icon: <CheckCircle className="h-12 w-12 text-green-500" />,
          title: "Application Accepted",
          message: "Congratulations! Your application has been approved. You need to subscribe to a plan before creating events.",
          showSubmitButton: false,
          showRefreshButton: false
        };
      case "rejected":
        return {
          icon: <XCircle className="h-12 w-12 text-red-500" />,
          title: "Application Rejected",
          message: feedback || "Unfortunately, your application was not approved at this time.",
          showSubmitButton: true,
          showRefreshButton: false
        };
      default:
        return {
          icon: <AlertCircle className="h-12 w-12 text-purple-500" />,
          title: "Loading Status",
          message: "Please wait while we fetch your application status...",
          showSubmitButton: false,
          showRefreshButton: false
        };
    }
  };

  // Add a function to check debug information
  const checkDebugInfo = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/organizer-applications/debug');
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log("Debug information:", data.data);
        alert(`Debug Info:\nTotal Applications: ${data.data.applicationsCount}\nCollections: ${data.data.collections.join(', ')}`);
      } else {
        alert("Failed to get debug information: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Debug error:", err);
      alert("Error fetching debug information");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#120a19] to-black flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0.5 }} 
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }}
          >
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-xl text-purple-400 font-medium"
          >
            Loading application status...
          </motion.p>
        </div>
      </div>
    );
  }

  const { icon, title, message, subMessage, showSubmitButton, showRefreshButton, showDebugButton } = getStatusDisplay();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#120a19] to-black flex items-center justify-center p-4">
      <NoiseBackground />
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center p-8 bg-gray-900/70 backdrop-blur-md rounded-xl max-w-md w-full shadow-xl border border-gray-800 relative overflow-hidden"
      >
        {/* Status-specific background glow */}
        <div className={`absolute inset-0 opacity-30 blur-xl rounded-xl ${
          status === "pending" ? "bg-yellow-900/20" : 
          status === "accepted" ? "bg-green-900/20" : 
          status === "rejected" ? "bg-red-900/20" : 
          "bg-purple-900/20"
        }`} />
        
        <motion.div 
          className="flex justify-center mb-4"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          {icon}
        </motion.div>
        
        <motion.h2 
          className="text-2xl text-white font-bold mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {title}
        </motion.h2>
        
        <motion.p 
          className="text-gray-300 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
        
        {subMessage && (
          <motion.p 
            className="text-gray-400 text-sm mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {subMessage}
          </motion.p>
        )}
        
        {status === "pending" && (
          <motion.div 
            className="w-full bg-gray-700 rounded-full h-2 mb-6 mt-4"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <motion.div 
              className="bg-yellow-500 h-2 rounded-full"
              animate={{ 
                width: ["0%", "100%", "0%"], 
                x: ["0%", "0%", "100%"]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </motion.div>
        )}
        
        <AnimatePresence>
          <motion.div 
            className="space-y-4"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {showSubmitButton && (
              <motion.button
                onClick={() => router.push("/organizer/form")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300 w-full font-medium"
              >
                Submit Application
              </motion.button>
            )}
            
            {showRefreshButton && applicationId && (
              <motion.button
                onClick={() => checkApplicationStatus(applicationId)}
                disabled={refreshing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300 w-full font-medium disabled:opacity-50 flex items-center justify-center"
              >
                {refreshing ? 
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Refreshing...
                  </> : 
                  <>
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Check for Updates
                  </>
                }
              </motion.button>
            )}

            {showDebugButton && session?.user?.email && (
              <motion.button
                onClick={checkDebugInfo}
                disabled={refreshing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-all duration-300 text-sm w-full flex items-center justify-center mt-8"
              >
                {refreshing ? 
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </> : 
                  "Diagnostic Check"
                }
              </motion.button>
            )}

            {status === "accepted" && (
              <div className="flex gap-4">
                <motion.button
                  onClick={() => router.push("/organizer/subscribe")}
                  whileHover={{ scale: 1.02, backgroundColor: '#7e22ce' }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300 w-full font-medium"
                >
                  Choose Plan
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ApplicationStatusClient; 