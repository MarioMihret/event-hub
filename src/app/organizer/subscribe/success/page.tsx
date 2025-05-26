"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CheckCircle, XCircle, Download, Clock, PlusCircle, Loader2, Share2, CalendarPlus } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReceiptData {
  transactionId: string;
  date: string;
  plan: string;
  amount: number;
  currency: string;
  customerEmail: string;
  expiryDate: string;
  paymentStatus: string;
}

function NoiseBackground() {
  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-20">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#120a19] to-black"></div>
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
    </div>
  );
}

// Component that uses useSearchParams
function SubscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin');
    },
  });
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [downloadTimer, setDownloadTimer] = useState(15);
  const [showReceipt, setShowReceipt] = useState(true);
  const [confetti, setConfetti] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [transactionRef, setTransactionRef] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'loading' || !session?.user?.email) return;

    // Get transaction reference from URL parameters
    // const tx_ref = searchParams.get('tx_ref');
    const tx_ref = "sub_1747758535718_gw6gbzv9v";
    setTransactionRef(tx_ref); // Store tx_ref in state

    console.log('Checking transaction reference:', tx_ref);

    // Check if user has an active subscription, particularly for free trials which don't have tx_ref
    const checkSubscription = async () => {
      try {
        const response = await fetch(`/api/subscriptions/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: session.user.email 
          }),
        });

        const data = await response.json();
        console.log('Subscription check response:', data);

        // Look for any active subscription, even if we don't have tx_ref
        if (response.ok && data.hasSubscription === true) {
          // Handle free trial or any active subscription case
            setStatus('success');
          
          // Determine if it's a trial plan
          const isTrial = data.activeSubscription?.planId === 'trial';
          setIsTrial(isTrial);
            setConfetti(true);
          
          // Set receipt data from the active subscription
            setReceiptData({
            transactionId: data.activeSubscription?.id || data.activeSubscription?.transactionId || 'active-subscription',
            date: new Date(data.activeSubscription?.startDate || Date.now()).toISOString(),
            plan: data.activeSubscription?.planId || 'Subscription',
            amount: data.activeSubscription?.amount || 0,
            currency: data.activeSubscription?.currency || 'ETB',
              customerEmail: session.user.email,
            expiryDate: new Date(data.activeSubscription?.endDate || Date.now()).toISOString(),
            paymentStatus: data.activeSubscription?.status || (isTrial ? 'Free' : 'Paid')
            });
            return;
        }

        // If there's a transaction reference, verify the payment even if subscription check didn't find it
        if (tx_ref) {
          await verifyPayment(tx_ref);
          return;
        }

        // No active subscription and no tx_ref, show error - use console.warn to avoid error overlay
        console.warn('No transaction reference found in URL parameters and no active subscription');
        setStatus('error');
        setMessage('No active subscription found. Please subscribe to a plan first.');
      } catch (error) {
        console.error('Error checking subscription:', error);
        setStatus('error');
        setMessage('An error occurred while checking your subscription status');
      }
    };

    // Verify payment for transactions with tx_ref
    const verifyPayment = async (txRef: string) => {
      try {
        // Play confetti animation
        setConfetti(true);
        
        // First, try to check the subscription by transaction reference
        const response = await fetch(`/api/subscriptions/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tx_ref: txRef }),
        });

        const data = await response.json();
        console.log('Payment verification response by tx_ref:', data);

        if (response.ok && data.success) {
          setStatus('success');
          setReceiptData(data.receiptData);
          
          // Start download timer
          const timerInterval = setInterval(() => {
            setDownloadTimer((prev) => {
              if (prev <= 1) {
                clearInterval(timerInterval);
                downloadReceipt(data.receiptData);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          
          return () => clearInterval(timerInterval);
        } 
        
        // If transaction verification failed, try one more check by email
        // This is a fallback in case the transaction reference was processed but not properly stored
        console.log('Transaction verification failed, checking by email as fallback');
        const emailCheckResponse = await fetch(`/api/subscriptions/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: session.user.email }),
        });
        
        const emailCheckData = await emailCheckResponse.json();
        console.log('Fallback email check response:', emailCheckData);
        
        if (emailCheckResponse.ok && emailCheckData.hasSubscription) {
          setStatus('success');
          setIsTrial(emailCheckData.activeSubscription?.planId === 'trial');
          setReceiptData({
            transactionId: txRef || 'verified-transaction',
            date: new Date(emailCheckData.activeSubscription?.startDate || Date.now()).toISOString(),
            plan: emailCheckData.activeSubscription?.planId || emailCheckData.plan || 'Subscription',
            amount: emailCheckData.activeSubscription?.amount || 0,
            currency: emailCheckData.activeSubscription?.currency || 'ETB',
            customerEmail: session.user.email,
            expiryDate: new Date(emailCheckData.activeSubscription?.endDate || emailCheckData.expiresAt || Date.now()).toISOString(),
            paymentStatus: emailCheckData.activeSubscription?.paymentStatus || 'Completed'
          });
          return;
        }
        
        // If both verification methods failed
        setStatus('error');
        setMessage(data.message || emailCheckData.message || 'Failed to verify payment. Please contact support.');
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('error');
        setMessage('An error occurred while verifying your payment. Please contact support.');
      }
    };

    // Start by checking subscription status
    checkSubscription();
  }, [session, sessionStatus, router, searchParams]);

  const downloadReceipt = (receiptData: ReceiptData) => {
    if (!receiptData) return;
    
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const receiptContent = `
      ===== PAYMENT RECEIPT =====
      
      Transaction ID: ${receiptData.transactionId}
      Date: ${formatDate(receiptData.date)}
      Customer: ${receiptData.customerEmail}
      
      Plan: ${receiptData.plan.toUpperCase()}
      Amount: ${receiptData.amount} ${receiptData.currency}
      Status: ${receiptData.paymentStatus}
      
      Valid Until: ${formatDate(receiptData.expiryDate)}
      
      Thank you for your subscription!
      ----------------------------
      This is an automatically generated receipt.
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${receiptData.transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleCreateEvent = () => {
    try {
      console.log("Redirecting to create event page");
      
      // Set a flag in session storage to indicate user came from success page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fromSubscriptionSuccess', 'true');
        sessionStorage.setItem('subscriptionPlan', isTrial ? 'trial' : 'paid');
      }
      
      // First attempt to navigate
      router.push('/organizer/create');
      
      // As a fallback, also try window.location if router doesn't redirect immediately
      setTimeout(() => {
        window.location.href = '/organizer/create';
      }, 500);
    } catch (error) {
      console.error("Navigation error:", error);
      // Direct fallback
      window.location.href = '/organizer/create';
    }
  };

  if (sessionStatus === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#120a19] to-black flex items-center justify-center">
        <NoiseBackground />
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-xl text-purple-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#120a19] to-black flex items-center justify-center p-4">
      <NoiseBackground />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-gray-900/70 backdrop-blur-md rounded-xl p-8 text-center border border-gray-800 relative overflow-hidden shadow-xl"
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 opacity-30 blur-xl rounded-xl bg-purple-900/30" />
        
        {status === 'loading' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10"
          >
            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-purple-500 mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Verifying your subscription...
            </h2>
            <p className="text-gray-400">Please wait while we confirm your payment.</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10"
          >
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-1">Payment Successful!</h1>
            <p className="text-gray-300 mb-6">
                {isTrial 
                ? 'Your free trial has been activated successfully.' 
                : 'Your payment has been processed successfully.'}
            </p>
            
            {/* Add immediate action buttons */}
            <div className="flex justify-center mb-6">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateEvent} 
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <CalendarPlus className="h-5 w-5" />
                Start Creating Events
              </motion.button>
            </div>
            
            {showReceipt && receiptData && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800/70 rounded-lg p-6 mb-8 border border-gray-700 text-left"
            >
              <h3 className="text-lg font-medium text-white mb-4">Subscription Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Plan:</span>
                  <span className="text-white font-medium">{receiptData.plan.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white font-medium">{receiptData.amount} {receiptData.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date:</span>
                  <span className="text-white font-medium">
                    {new Date(receiptData.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expires:</span>
                  <span className="text-white font-medium">
                    {new Date(receiptData.expiryDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Transaction ID:</span>
                  <span className="text-white font-medium">{receiptData.transactionId}</span>
                </div>
              </div>
            </motion.div>
            )}
            
            {/* Download receipt option - show only for paid plans */}
            {!isTrial && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-800/70 rounded-lg p-4 mb-6 border border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white">Payment Receipt</h4>
                    <p className="text-sm text-gray-400">Download for your records</p>
                  </div>
                  <motion.button
                    onClick={() => downloadReceipt(receiptData)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gray-700 hover:bg-gray-600 transition-colors text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    {downloadTimer > 0 ? `Download (${downloadTimer}s)` : 'Download'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10"
          >
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Verification Issue</h1>
            <p className="text-gray-300 mb-4">
              {message || 'There was an issue verifying your subscription status.'}
            </p>
            
            {/* Primary action - Direct to Create anyway */}
            <div className="mb-8">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/organizer/create')}
                className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-8 py-4 rounded-lg shadow-lg shadow-purple-900/30 font-medium text-lg w-full flex items-center justify-center gap-2"
              >
                <CalendarPlus className="h-5 w-5" />
                Continue to Create Event
              </motion.button>
              <p className="text-sm text-gray-400 mt-2">
                Your subscription might already be active. Click above to continue.
              </p>
            </div>
            
            <div className="flex justify-center">
            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/organizer/subscribe')}
                className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Back to Subscription
              </motion.button>
            </div>
            
            {/* Debug info - hidden by default */}
            <div className="mt-8 pt-6 border-t border-gray-800">
              <details className="text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400 mb-2">Debug Information</summary>
                <div className="bg-gray-900 p-4 rounded text-xs font-mono text-gray-300 mb-4 max-h-48 overflow-auto">
                  <p>Transaction Reference: {transactionRef || 'None'}</p>
                  <p>Email: {session?.user?.email || 'Unknown'}</p>
                  <p>Time: {new Date().toISOString()}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.location.reload()}
                    className="flex items-center justify-center gap-2 bg-gray-700/50 hover:bg-gray-600/70 text-white px-6 py-2 rounded-lg transition-colors text-sm"
                  >
                    Refresh Page
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      // Force check on backend
                      fetch('/api/subscriptions/check', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: session?.user?.email })
                      })
                      .then(res => res.json())
                      .then(data => {
                        console.log('Manual check result:', data);
                        alert('Check console for results');
                      })
                      .catch(err => console.error('Manual check failed:', err));
                    }}
                    className="flex items-center justify-center gap-2 bg-blue-700/30 hover:bg-blue-600/50 text-white px-6 py-2 rounded-lg transition-colors text-sm"
                  >
                    Force Subscription Check
            </motion.button>
                </div>
              </details>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-xl text-purple-400 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  );
} 