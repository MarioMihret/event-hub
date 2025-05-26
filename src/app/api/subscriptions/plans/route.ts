import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Try multiple possible collection names to ensure we find the plans
    let plans = [];
    let collection;
    const possibleCollectionNames = ['planDefinitions', 'plans', 'subscriptionPlans'];
    
    // Try each collection name until we find plans
    for (const collectionName of possibleCollectionNames) {
      try {
        collection = await getCollection(collectionName);
        // Remove the isActive filter to see all plans
        const foundPlans = await collection.find({}).sort({ displayOrder: 1 }).toArray();
        
        if (foundPlans && foundPlans.length > 0) {
          plans = foundPlans;
          console.log(`Found ${plans.length} plans in collection ${collectionName}`);
          break;
        }
      } catch (err) {
        console.log(`Error checking collection ${collectionName}:`, err);
        // Continue to the next collection
      }
    }
    
    // If no plans found, insert default plans for testing
    if (!plans || plans.length === 0) {
      console.log("No plans found in any collection, returning default plans");
      
      // Return default plans for testing
      const defaultPlans = [
        {
          _id: "default_trial",
          slug: "trial",
          name: "Free Trial",
          price: 0,
          durationDays: 14,
          description: "Try our platform risk-free",
          features: [
            { id: "events", name: "Create Events", description: "Create and manage basic events", included: true },
            { id: "attendees", name: "Attendee Management", description: "Basic attendee tracking", included: true },
            { id: "analytics", name: "Basic Analytics", description: "Simple event statistics", included: false },
            { id: "support", name: "Email Support", description: "Basic email support", included: true }
          ],
          limits: {
            maxEvents: 2,
            maxAttendeesPerEvent: 50,
            maxFileUploads: 3,
            maxImageSize: 5,
            maxVideoLength: 0,
            customDomain: false,
            analytics: "basic",
            support: "email",
            eventTypes: ["basic"]
          },
          displayOrder: 0,
          isActive: true,
          metadata: {
            isPopular: false,
            isTrial: true,
            isEnterpriseFlag: false
          }
        },
        {
          _id: "default_basic",
          slug: "basic",
          name: "Basic Plan",
          price: 500,
          durationDays: 30,
          description: "Perfect for getting started",
          features: [
            { id: "events", name: "Create Events", description: "Create and manage events", included: true },
            { id: "attendees", name: "Attendee Management", description: "Full attendee tracking", included: true },
            { id: "analytics", name: "Basic Analytics", description: "Comprehensive event statistics", included: true },
            { id: "support", name: "Email Support", description: "Priority email support", included: true }
          ],
          limits: {
            maxEvents: 5,
            maxAttendeesPerEvent: 100,
            maxFileUploads: 10,
            maxImageSize: 10,
            maxVideoLength: 5,
            customDomain: false,
            analytics: "standard",
            support: "email",
            eventTypes: ["basic", "advanced"]
          },
          displayOrder: 1,
          isActive: true,
          metadata: {
            isPopular: false,
            isTrial: false,
            isEnterpriseFlag: false
          }
        },
        {
          _id: "default_premium",
          slug: "premium",
          name: "Premium Plan",
          price: 5000,
          durationDays: 365,
          description: "Best for active organizers",
          features: [
            { id: "events", name: "Unlimited Events", description: "Create and manage unlimited events", included: true },
            { id: "attendees", name: "Advanced Attendee Management", description: "Full attendee tracking and management", included: true },
            { id: "analytics", name: "Advanced Analytics", description: "Comprehensive analytics and reporting", included: true },
            { id: "support", name: "Priority Support", description: "24/7 priority support", included: true },
            { id: "branding", name: "Custom Branding", description: "Remove platform branding", included: true }
          ],
          limits: {
            maxEvents: -1, // unlimited
            maxAttendeesPerEvent: -1, // unlimited
            maxFileUploads: 50,
            maxImageSize: 25,
            maxVideoLength: 30,
            customDomain: true,
            analytics: "advanced",
            support: "priority",
            eventTypes: ["basic", "advanced", "premium"]
          },
          displayOrder: 2,
          isActive: true,
          metadata: {
            isPopular: true,
            isTrial: false,
            isEnterpriseFlag: false
          }
        },
        {
          _id: "default_enterprise",
          slug: "enterprise",
          name: "Enterprise",
          price: "Custom",
          durationDays: 365,
          description: "Tailored for large organizations",
          features: [
            { id: "events", name: "Custom Event Limits", description: "Tailored to your organization's needs", included: true },
            { id: "support", name: "Dedicated Support Team", description: "Personal account manager", included: true },
            { id: "integrations", name: "Custom Integrations", description: "Integrate with your existing systems", included: true },
            { id: "sla", name: "SLA Guarantees", description: "Guaranteed uptime and performance", included: true },
            { id: "security", name: "Advanced Security", description: "Enhanced security features", included: true },
            { id: "reporting", name: "Custom Reporting", description: "Tailored reporting solutions", included: true }
          ],
          limits: {
            maxEvents: -1,
            maxAttendeesPerEvent: -1,
            maxFileUploads: -1,
            maxImageSize: 50,
            maxVideoLength: 60,
            customDomain: true,
            analytics: "enterprise",
            support: "dedicated",
            eventTypes: ["basic", "advanced", "premium", "enterprise"]
          },
          displayOrder: 3,
          isActive: true,
          metadata: {
            isPopular: false,
            isTrial: false,
            isEnterpriseFlag: true
          }
        }
      ];
      
      return NextResponse.json(defaultPlans, { status: 200 });
    }

    return NextResponse.json(plans, { status: 200 });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: String(error) }, { status: 500 });
  }
} 