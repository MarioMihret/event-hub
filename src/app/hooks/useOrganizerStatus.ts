// // app/organizer/hooks/useOrganizerStatus.ts
// "use client";

// import { useState } from 'react';
// import { useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";
// import { canSubmitNewApplication } from '@/lib/utils/applicationUtils';

// export default function useOrganizerStatus(setShowLandingPage: React.Dispatch<React.SetStateAction<boolean>>) {
//   const router = useRouter();
//   const { data: session } = useSession();
//   const [isVerifying, setIsVerifying] = useState(false);
//   const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
//   const [applicationFeedback, setApplicationFeedback] = useState<string | null>(null);
//   const [applicationId, setApplicationId] = useState<string | null>(null);
//   const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

//   const handleApplyClick = async () => {
//     setIsVerifying(true);
//     setShowLandingPage(false);
    
//     try {
//       const response = await fetch('/api/organizer-applications/verify', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           email: session?.user?.email,
//         }),
//       });

//       const data = await response.json();

//       if (data.success) {
//         switch (data.status) {
//           case 'accepted':
//             // Check subscription status
//             const subResponse = await fetch('/api/subscriptions/check', {
//               method: 'POST',
//               headers: {
//                 'Content-Type': 'application/json',
//               },
//               body: JSON.stringify({
//                 email: session?.user?.email,
//               }),
//             });
//             const subData = await subResponse.json();
            
//             if (!subData.hasSubscription) {
//               router.push('/organizer/subscribe');
//             } else if (subData.status === 'active') {
//               setApplicationStatus('approved');
//               setSubscriptionStatus('active');
//             } else {
//               router.push('/organizer/subscribe');
//             }
//             break;
//           case 'pending':
//             router.push(`/organizer/status/${data.applicationId}`);
//             break;
//           case 'rejected':
//             router.push(`/organizer/status/${data.applicationId}`);
//             break;
//           default:
//             router.push('/organizer/form');
//         }
//       } else {
//         router.push('/organizer/form');
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       router.push('/organizer/form');
//     } finally {
//       setIsVerifying(false);
//     }
//   };

//   const handleCheckStatus = async () => {
//     setIsVerifying(true);
//     try {
//       const response = await fetch('/api/organizer-applications/verify', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           email: session?.user?.email,
//         }),
//       });

//       const data = await response.json();

//       if (data.success) {
//         switch (data.status) {
//           case 'pending':
//           case 'rejected':
//             router.push(`/organizer/status/${data.applicationId}`);
//             break;
//           case 'accepted':
//             // Check subscription status
//             const subResponse = await fetch('/api/subscriptions/check', {
//               method: 'POST',
//               headers: {
//                 'Content-Type': 'application/json',
//               },
//               body: JSON.stringify({
//                 email: session?.user?.email,
//               }),
//             });
//             const subData = await subResponse.json();
            
//             if (!subData.hasSubscription || subData.status !== 'active') {
//               router.push('/organizer/subscribe');
//             } else {
//               setApplicationStatus('approved');
//               setSubscriptionStatus('active');
//               setShowLandingPage(false);
//             }
//             break;
//           default:
//             router.push('/organizer/form');
//         }
//       } else {
//         router.push('/organizer/form');
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       router.push('/organizer/form');
//     } finally {
//       setIsVerifying(false);
//     }
//   };

//   const verifySubscriptionPayment = async (transactionRef: string, email: string): Promise<boolean> => {
//     try {
//       const response = await fetch('/api/payments/verify', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           transactionRef,
//           email
//         }),
//       });

//       const data = await response.json();
      
//       if (data.success && data.verified) {
//         // Update subscription status
//         setSubscriptionStatus('active');
//         return true;
//       }
      
//       return false;
//     } catch (error) {
//       console.error('Payment verification error:', error);
//       return false;
//     }
//   };

//   return {
//     isVerifying,
//     applicationStatus,
//     applicationFeedback,
//     applicationId,
//     subscriptionStatus,
//     handleApplyClick,
//     handleCheckStatus,
//     canSubmitNewApplication,
//     verifySubscriptionPayment
//   };
// }