// import { ObjectId } from 'mongodb'; // Added for PlanDocument._id

// export interface PlanFeature {
//   id: string;
//   name: string;
//   description: string;
//   included: boolean;
// }

// export interface PlanLimits {
//   maxEvents: number;
//   maxAttendeesPerEvent: number;
//   maxFileUploads: number;
//   maxImageSize: number; // in MB
//   maxVideoLength: number; // in minutes
//   customDomain: boolean;
//   analytics: 'basic' | 'advanced' | 'premium';
//   support: 'email' | 'priority' | '24/7';
//   eventTypes: string[];
// }

// // Represents the structure of a plan document as stored in MongoDB
// export interface PlanDocument {
//   _id?: ObjectId;
//   slug: string;
//   name: string;
//   price: number;
//   durationDays: number;
//   features: PlanFeature[];
//   limits: PlanLimits;
//   isActive?: boolean;      // From user JSON example
//   description?: string;    // From user JSON example
//   displayOrder?: number;   // From user JSON example
//   metadata?: Record<string, any>; // From user JSON example
//   // Optional MongoDB specific fields, if needed for typing elsewhere
//   // __v?: number;
//   // createdAt?: Date; // Assuming this might exist, though not in user's example for PlanDocument directly
//   // updatedAt?: Date; // From user JSON example
// }

// export interface Plan {
//   id: string; 
//   name: string;
//   price: number; 
//   duration: number; // Duration in days.
//   features: PlanFeature[];
//   limits: PlanLimits;
//   isActive?: boolean;
//   description?: string; 
//   displayOrder?: number;
//   metadata?: Record<string, any>;
// }

// // This PLANS constant is now primarily for fallback, initial data structure reference,
// // or for parts of the app that explicitly need to use hardcoded values.
// // It uses the PlanDocument structure, similar to what's in the database.
// // Plan definitions for active subscriptions are primarily managed and fetched from the database
// // by the `subscriptionService.ts`.
// export const PLANS: { [key: string]: PlanDocument } = {
//   trial: {
//     slug: 'trial',
//     name: 'Free Trial',
//     price: 0,
//     durationDays: 14,
//     isActive: true,
//     description: 'Try our platform risk-free with basic features for 14 days.',
//     features: [
//       { id: 'events', name: 'Create Events', description: 'Create and manage basic events', included: true },
//       { id: 'attendees', name: 'Attendee Management', description: 'Basic attendee tracking', included: true },
//       { id: 'analytics', name: 'Basic Analytics', description: 'Simple event statistics', included: true },
//       { id: 'support', name: 'Email Support', description: 'Basic email support', included: true },
//       { id: 'customization', name: 'Event Customization', description: 'Basic event customization', included: false },
//       { id: 'promotion', name: 'Event Promotion', description: 'Promote events on platform', included: false }
//     ],
//     limits: {
//       maxEvents: 2,
//       maxAttendeesPerEvent: 50,
//       maxFileUploads: 3,
//       maxImageSize: 5,
//       maxVideoLength: 0,
//       customDomain: false,
//       analytics: 'basic',
//       support: 'email',
//       eventTypes: ['basic']
//     },
//     metadata: { isTrial: true },
//     displayOrder: 1
//   },
//   basic: {
//     slug: 'basic',
//     name: 'Basic Plan',
//     price: 500,
//     durationDays: 30,
//     isActive: true,
//     description: 'Perfect for getting started and organizing a few events.',
//     features: [
//       { id: 'events', name: 'Create Events', description: 'Create and manage multiple events', included: true },
//       { id: 'attendees', name: 'Attendee Management', description: 'Advanced attendee tracking', included: true },
//       { id: 'analytics', name: 'Basic Analytics', description: 'Detailed event statistics', included: true },
//       { id: 'support', name: 'Priority Support', description: 'Priority email support', included: true },
//       { id: 'customization', name: 'Event Customization', description: 'Advanced event customization', included: true },
//       { id: 'promotion', name: 'Event Promotion', description: 'Promote events on platform', included: true }
//     ],
//     limits: {
//       maxEvents: 5,
//       maxAttendeesPerEvent: 200,
//       maxFileUploads: 10,
//       maxImageSize: 10,
//       maxVideoLength: 10,
//       customDomain: false,
//       analytics: 'basic',
//       support: 'priority',
//       eventTypes: ['basic', 'workshop', 'seminar']
//     },
//     displayOrder: 2
//   },
//   premium: {
//     slug: 'premium',
//     name: 'Premium Plan',
//     price: 5000,
//     durationDays: 365,
//     isActive: true,
//     description: 'Best for active organizers needing advanced features and priority support.',
//     features: [
//       { id: 'events', name: 'Create Events', description: 'Unlimited event creation', included: true },
//       { id: 'attendees', name: 'Attendee Management', description: 'Full attendee management suite', included: true },
//       { id: 'analytics', name: 'Premium Analytics', description: 'Advanced analytics and reporting', included: true },
//       { id: 'support', name: '24/7 Support', description: 'Round-the-clock priority support', included: true },
//       { id: 'customization', name: 'Event Customization', description: 'Full customization capabilities', included: true },
//       { id: 'promotion', name: 'Event Promotion', description: 'Premium promotion features', included: true }
//     ],
//     limits: {
//       maxEvents: -1,
//       maxAttendeesPerEvent: -1,
//       maxFileUploads: -1,
//       maxImageSize: 50,
//       maxVideoLength: 60,
//       customDomain: true,
//       analytics: 'premium',
//       support: '24/7',
//       eventTypes: ['basic', 'workshop', 'seminar', 'conference', 'expo', 'premium']
//     },
//     metadata: { isPopular: true },
//     displayOrder: 3
//   },
//   enterprise: {
//     slug: 'enterprise',
//     name: 'Enterprise',
//     price: 0, 
//     durationDays: 365,
//     isActive: true,
//     description: 'Tailored for large organizations with custom needs and dedicated support.',
//     features: [
//       { id: 'events', name: 'Custom Event Limits', description: 'Tailored event creation capacity', included: true },
//       { id: 'attendees', name: 'Dedicated Attendee Support', description: 'Specialized support for attendees', included: true },
//       { id: 'analytics', name: 'Bespoke Analytics', description: 'Custom analytics and reporting dashboards', included: true },
//       { id: 'support', name: 'Dedicated Support Team', description: 'Dedicated account manager and support team', included: true },
//       { id: 'customization', name: 'Full Platform Customization', description: 'White-labeling and deep customization', included: true },
//       { id: 'integrations', name: 'Custom Integrations', description: 'Integrate with your existing enterprise systems', included: true },
//       { id: 'sla', name: 'SLA Guarantees', description: 'Service Level Agreements for uptime and support', included: true },
//       { id: 'security', name: 'Advanced Security', description: 'Enhanced security features and compliance', included: true }
//     ],
//     limits: {
//       maxEvents: -1, 
//       maxAttendeesPerEvent: -1,
//       maxFileUploads: -1,
//       maxImageSize: 100,
//       maxVideoLength: 120,
//       customDomain: true,
//       analytics: 'premium',
//       support: '24/7',
//       eventTypes: ['all']
//     },
//     metadata: { isEnterpriseFlag: true },
//     displayOrder: 4
//   }
// };

// // Client-safe utility functions that DO NOT access the database can remain here or be moved to other utils.
// // For example, a function that formats plan price based on a Plan object could live here.

// // Note: Database-dependent plan logic (fetching plans, checking active subscription features/limits)
// // is handled within `subscriptionService.ts`. 