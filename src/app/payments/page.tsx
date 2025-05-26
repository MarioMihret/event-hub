"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import type { Event } from "@/types/event";
import { Loader, XCircle, Mail, ArrowRight } from "lucide-react";

// Minimal loading component
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
    <Loader className="animate-spin h-12 w-12 text-purple-400" />
    <p className="mt-4 text-lg">Loading event details...</p>
  </div>
);

// Error display component
const ErrorDisplay = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
    <XCircle className="h-12 w-12 text-red-500" />
    <p className="mt-4 text-lg text-center">{message}</p>
    <button
      onClick={() => window.history.back()}
      className="mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition-colors"
    >
      Go Back
    </button>
  </div>
);

// Email Collection Form component
interface EmailCollectionFormProps {
  eventId: string;
  onSuccess: () => void;
}

const EmailCollectionForm = ({ eventId, onSuccess }: EmailCollectionFormProps) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setFormError("Please enter your email address");
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address");
      return;
    }
    
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      // Store email in localStorage for future payment requests
      localStorage.setItem('user_email', email);
      
      // Notify the parent component that email collection is successful
      onSuccess();
      
    } catch (error) {
      console.error("Error saving email:", error);
      setFormError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 shadow-xl border border-purple-500/20">
        <div className="flex items-center justify-center h-20 w-20 rounded-full bg-purple-600/20 mx-auto mb-6">
          <Mail className="h-10 w-10 text-purple-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">Complete Your Payment</h1>
        <p className="text-gray-300 text-center mb-6">Please provide your email address to continue with the payment</p>
        
        {formError && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-3 rounded-md mb-4">
            {formError}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-md bg-gray-700 border-gray-600 text-white px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors ${
              isSubmitting
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader className="animate-spin h-4 w-4" />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default function PaymentsRouterPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const currentEventIdFromUrl = searchParams.get("eventId");
    const currentActionFromUrl = searchParams.get("action");

    setEventId(currentEventIdFromUrl);
    setAction(currentActionFromUrl);

    if (!currentEventIdFromUrl) {
      setError("Event ID is missing in the URL.");
      setIsLoading(false);
      toast.error("Event ID is missing.");
      return;
    }

    if (authStatus === 'loading') {
      setIsLoading(true);
      return;
    }

    if (authStatus === 'unauthenticated' && currentActionFromUrl !== 'collect_email') {
      toast.error("Please sign in to proceed with payment.");
      let callbackUrl = `/payments?eventId=${currentEventIdFromUrl}`;
      if (currentActionFromUrl) {
        callbackUrl += `&action=${currentActionFromUrl}`;
      }
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      setIsLoading(false);
      return;
    }

    if (currentActionFromUrl === 'collect_email') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const fetchEventAndRedirect = async () => {
      try {
        const response = await fetch(`/api/events/${currentEventIdFromUrl}?minimal=true`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch event type: ${response.statusText}`);
        }
        const eventDataPayload = await response.json();
        const event = eventDataPayload.event as Partial<Event> & { isVirtual?: boolean };

        if (!event || typeof event.isVirtual === 'undefined') {
          throw new Error("Could not determine event type (virtual/location).");
        }

        if (event.isVirtual) {
          router.replace(`/payments/virtual?eventId=${currentEventIdFromUrl}`);
        } else {
          router.replace(`/payments/location?eventId=${currentEventIdFromUrl}`);
        }
      } catch (err: any) {
        console.error("Error fetching event for routing:", err);
        setError(err.message || "Could not load event details for redirection.");
        toast.error(err.message || "Failed to load event details.");
        setIsLoading(false);
      }
    };

    fetchEventAndRedirect();

  }, [authStatus, router]);
  
  const handleEmailCollectionSuccess = () => {
    toast.success("Email saved successfully!");
    if (eventId) {
      router.replace(`/events/${eventId}`);
    }
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }
  
  if (action === "collect_email" && eventId) {
    return <EmailCollectionForm eventId={eventId} onSuccess={handleEmailCollectionSuccess} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <p>Redirecting...</p>
    </div>
  );
}