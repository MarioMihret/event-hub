import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import axios from "axios";
import { ObjectId } from "mongodb";

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_URL = "https://api.chapa.co/v1/transaction/initialize";

// Define a proper interface for validation rules
interface ValidationRule {
  type: string;
  required?: boolean;
  pattern?: RegExp;
  min?: number;
}

// Define the schema with proper typing
const createSubscriptionSchema: Record<string, ValidationRule> = {
  email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  planId: { type: 'string', required: true },
  userId: { type: 'string', required: true },
  firstName: { type: 'string', required: true, min: 2 },
  lastName: { type: 'string', required: true, min: 2 },
  forceRenew: { type: 'boolean' },
  planChangeType: { type: 'string' }
};

export async function POST(request: NextRequest) {
  try {
    // Check session authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please sign in" },
        { status: 401 }
      );
    }
    
    // Rate limiting could be implemented here
    
    // Validate input
    let body;
    try {
      body = await request.json();
      
      // Simple validation
      for (const [field, rules] of Object.entries(createSubscriptionSchema)) {
        if (rules.required && !body[field]) {
          return NextResponse.json(
            { success: false, error: `${field} is required` },
            { status: 400 }
          );
        }
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }
    
    const { email, planId, userId, firstName, lastName, forceRenew = false, planChangeType = 'new' } = body;
    
    console.log(`Subscription request: ${planChangeType} to ${planId} for user ${userId}. forceRenew=${forceRenew}`);

    // Direct MongoDB connections
    const planDefinitionsCollection = await getCollection('planDefinitions');
    const subscriptionsCollection = await getCollection('subscriptions');

    // Get plan details
    const plan = await planDefinitionsCollection.findOne({ slug: planId });
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    // Check for existing active subscription
    const userObjectId = new ObjectId(userId);
    
    // Find all active subscriptions for this user
    const existingSubscriptions = await subscriptionsCollection.find({
      userId: userObjectId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).toArray();

    // Get the newest existing subscription if there are any
    const existingSubscription = existingSubscriptions.length > 0 ? 
      existingSubscriptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] : null;
    
    console.log(`Found ${existingSubscriptions.length} active subscriptions for user ${userId}. forceRenew=${forceRenew}`);
    
    // If we find active subscriptions and forceRenew is false, return error
    if (existingSubscription && !forceRenew) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Active subscription exists. Set forceRenew to true to replace it.",
          subscription: existingSubscription
        },
        { status: 400 }
      );
    }

    // Generate transaction reference
    const tx_ref = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Cancel ALL existing active subscriptions if forceRenew is true
    if (existingSubscriptions.length > 0 && forceRenew) {
      console.log(`Cancelling ${existingSubscriptions.length} active subscriptions for user ${userId}`);
      
      // Cancel each subscription
      const cancelPromises = existingSubscriptions.map(async (sub) => {
        console.log(`Cancelling subscription: ${sub._id} (${sub.planId})`);
        
        try {
          const result = await subscriptionsCollection.updateOne(
            { _id: sub._id },
            { 
              $set: { 
                status: 'cancelled',
                cancelledAt: new Date(),
                cancellationReason: `Replaced by ${planId} plan via ${planChangeType}`,
                updatedAt: new Date()
              } 
            }
          );
          
          console.log(`Cancellation result for ${sub._id}: ${result.modifiedCount} document modified`);
          return result;
        } catch (err) {
          console.error(`Error cancelling subscription ${sub._id}:`, err);
          throw err;
        }
      });
      
      // Wait for all cancellations to complete
      const cancellationResults = await Promise.all(cancelPromises);
      console.log(`All cancellations completed. Total modified: ${cancellationResults.reduce((acc, r) => acc + r.modifiedCount, 0)}`);
      
      // Double verify the cancellations happened
      const stillActiveSubscriptions = await subscriptionsCollection.find({
        userId: userObjectId,
        status: 'active',
        endDate: { $gt: new Date() }
      }).toArray();
      
      if (stillActiveSubscriptions.length > 0) {
        console.warn(`WARNING: Still found ${stillActiveSubscriptions.length} active subscriptions after cancellation`);
      } else {
        console.log('Subscription cancellation verified - no active subscriptions remain');
      }
    }

    // For free trial, skip payment
    if (planId === 'trial') {
      // Calculate the end date based on plan duration days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (plan.durationDays || 14)); // Default to 14 if not specified
      
      // Create active subscription immediately
      const newSubscription = {
        userId: userObjectId,
        planId,
        status: 'active',
        paymentStatus: 'paid',
        startDate,
        endDate,
        transactionRef: tx_ref,
        amount: 0,
        currency: 'ETB', // Default currency
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          planName: plan.name,
          planDuration: plan.durationDays || 14,
          transactionType: 'free_trial',
          replacedSubscription: existingSubscription ? existingSubscription._id : null
        }
      };

      const result = await subscriptionsCollection.insertOne(newSubscription);
      const insertedSubscription = { ...newSubscription, _id: result.insertedId };

      return NextResponse.json({
        success: true,
        data: {
          subscription: insertedSubscription,
          redirect: '/organizer/subscribe/success?tx_ref=' + tx_ref
        }
      });
    }

    // For paid plans
    // Calculate subscription dates based on plan duration
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (plan.durationDays || 30)); // Default to 30 if not specified
    
    // Initialize payment with Chapa
    const paymentData = {
      amount: plan.price.toString(),
      currency: 'ETB', // Default currency
      email,
      first_name: firstName,
      last_name: lastName,
      tx_ref,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/subscriptions/callback`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/organizer/subscribe/success`,
      "customization[title]": `${plan.name} Subscription`
    };

    try {
      const paymentResponse = await axios.post(CHAPA_URL, paymentData, {
        headers: {
          "Authorization": `Bearer ${CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      });

      // Create pending subscription
      const newSubscription = {
        userId: userObjectId,
        planId,
        status: 'pending',
        paymentStatus: 'pending',
        startDate,
        endDate,
        transactionRef: tx_ref,
        amount: plan.price,
        currency: 'ETB',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          planName: plan.name,
          planDuration: plan.durationDays || 30,
          paymentInitResponse: paymentResponse.data,
          replacedSubscription: existingSubscription ? existingSubscription._id : null
        }
      };

      const result = await subscriptionsCollection.insertOne(newSubscription);
      const insertedSubscription = { ...newSubscription, _id: result.insertedId };

      return NextResponse.json({
        success: true,
        data: {
          checkoutUrl: paymentResponse.data.data.checkout_url,
          subscription: insertedSubscription
        }
      });
    } catch (paymentError) {
      console.error("Payment initialization error:", paymentError);
      return NextResponse.json(
        { success: false, error: "Failed to initialize payment", details: paymentError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Subscription creation failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create subscription", details: error.message },
      { status: 500 }
    );
  }
} 