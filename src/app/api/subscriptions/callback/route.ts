import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { headers } from "next/headers";
import crypto from "crypto";
import { ObjectId } from "mongodb";

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;

interface PaymentResult {
  success: boolean;
  message?: string;
  error?: string;
  status?: string;
  redirect?: string;
  data?: any;
  receiptData?: any;
}

// Helper function to verify payment with Chapa
async function verifyPayment(tx_ref: string) {
  if (!CHAPA_SECRET_KEY) {
    console.error("Chapa secret key is not configured.");
    throw new Error("Chapa secret key is not configured.");
  }
  try {
    const response = await fetch(
      `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Chapa verification API error:', response.status, errorBody);
      throw new Error(`Payment verification failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error verifying payment with Chapa:', error);
    throw error;
  }
}

// Helper function to process the payment status
async function processPaymentStatus(tx_ref: string): Promise<PaymentResult> {
  try {
    // Get collections directly
    const subscriptionsCollection = await getCollection('subscriptions');
    const planDefinitionsCollection = await getCollection('planDefinitions');

    const subscription = await subscriptionsCollection.findOne({
      $or: [
        { transactionRef: tx_ref },
        { txRef: tx_ref },
        { tx_ref: tx_ref }
      ]
    });

    if (!subscription) {
      console.error('Subscription not found for tx_ref:', tx_ref);
      throw new Error('Subscription not found');
    }
    console.log('Found subscription for processing:', subscription);

    // Verify payment status with Chapa
    const chapaResponse = await verifyPayment(tx_ref);
    console.log('Chapa verification response:', chapaResponse);
    
    // Get plan details directly from planDefinitions collection
    const plan = await planDefinitionsCollection.findOne({ slug: subscription.planId });
    if (!plan) {
      console.error(`Plan details not found for planId: ${subscription.planId}`);
      throw new Error(`Plan details not found for planId: ${subscription.planId}`);
    }

    if (chapaResponse.status === 'success' && chapaResponse.data?.status === 'success') {
      const startDate = subscription.startDate || new Date();
      const expiryDate = new Date(startDate);
      
      // Use durationDays from plan for expiry calculation
      if (plan.durationDays && Number(plan.durationDays) > 0) {
        expiryDate.setDate(expiryDate.getDate() + Number(plan.durationDays));
      } else {
        console.warn(`Plan ${plan.slug} has invalid durationDays: ${plan.durationDays}. Using default expiry of 30 days.`);
        expiryDate.setDate(expiryDate.getDate() + 30); 
      }

      await subscriptionsCollection.updateOne(
        { _id: subscription._id },
        {
          $set: {
            status: 'active',
            updatedAt: new Date(),
            paymentStatus: 'paid',
            startDate: startDate,
            endDate: expiryDate,
            transactionRef: tx_ref, 
            chapaVerificationResponse: chapaResponse
          }
        }
      );

      return {
        success: true,
        status: 'success',
        message: 'Payment verified successfully',
        data: {
          transactionId: tx_ref,
          date: new Date().toISOString(),
          plan: subscription.planId,
          amount: subscription.amount,
          currency: subscription.currency || 'ETB',
          customerEmail: chapaResponse.data?.email || subscription.email,
          endDate: expiryDate.toISOString(),
          paymentStatus: 'Paid'
        }
      };
    } else {
      await subscriptionsCollection.updateOne(
        { _id: subscription._id },
        {
          $set: {
            status: 'failed',
            updatedAt: new Date(),
            paymentStatus: 'failed',
            transactionRef: tx_ref, 
            chapaVerificationResponse: chapaResponse
          }
        }
      );

      return {
        success: false,
        status: 'failed',
        message: chapaResponse.message || 'Payment verification failed with Chapa',
        error: chapaResponse.message || 'Unknown Chapa error'
      };
    }
  } catch (error) {
    console.error('Error processing payment status:', error);
    throw error;
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Chapa-Signature',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tx_ref = url.searchParams.get('tx_ref') || 
                  url.searchParams.get('trx_ref') || 
                  url.searchParams.get('transaction_ref');

    if (!tx_ref) {
      console.error('Missing transaction reference in callback');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL('/', request.url).origin;
      return NextResponse.redirect(new URL('/organizer/subscribe?error=missing_reference', baseUrl));
    }
    console.log('Received transaction reference for GET:', tx_ref);

    const result = await processPaymentStatus(tx_ref);
    console.log('Payment status result for GET:', result);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL('/', request.url).origin;

    if (result.status === 'success') {
      const successUrl = new URL('/organizer/subscribe/success', baseUrl);
      successUrl.searchParams.set('tx_ref', tx_ref);
      return NextResponse.redirect(successUrl.toString());
    } else {
      const errorUrl = new URL('/organizer/subscribe', baseUrl);
      errorUrl.searchParams.set('error', 'payment_failed');
      errorUrl.searchParams.set('message', result.message || 'Payment verification failed');
      return NextResponse.redirect(errorUrl.toString());
    }
  } catch (error) {
    console.error('Error in callback GET:', error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL('/', request.url).origin;
    const errorUrl = new URL('/organizer/subscribe', baseUrl);
    errorUrl.searchParams.set('error', 'server_error');
    errorUrl.searchParams.set('message', message);
    return NextResponse.redirect(errorUrl.toString());
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const headersList = await headers();
    const signature = headersList.get('x-chapa-signature');
    
    if (!CHAPA_SECRET_KEY) {
      console.error("CRITICAL: Chapa Webhook Secret Key is not configured for signature verification.");
      return NextResponse.json({ success: false, error: 'Webhook security not configured.' }, { status: 500 });
    }

    if (signature) {
      const expectedSignature = crypto
        .createHmac("sha256", CHAPA_SECRET_KEY)
        .update(rawBody)
        .digest("hex");
      
      console.log('Chapa Webhook signature received (placeholder verification):', signature);
    } else {
      console.warn("Chapa Webhook signature missing. Ensure Chapa is configured to send it.");
    }

    const data = JSON.parse(rawBody);
    console.log('Callback POST data (Webhook):', data);

    const tx_ref = data.tx_ref || data.trx_ref || data.transaction_ref || data.data?.tx_ref;
    
    if (!tx_ref) {
      console.error('No transaction reference in webhook data');
      return NextResponse.json({ success: false, error: 'No transaction reference in webhook data' }, { status: 400 });
    }

    const chapaVerification = await verifyPayment(tx_ref);
    console.log('Chapa verification response within POST (Webhook):', chapaVerification);

    if (chapaVerification.status === 'success' && chapaVerification.data?.status === 'success') {
      // Get collections directly
      const subscriptionsCollection = await getCollection('subscriptions');
      const planDefinitionsCollection = await getCollection('planDefinitions');
      
      const subscription = await subscriptionsCollection.findOne({
        $or: [{ transactionRef: tx_ref }, { txRef: tx_ref }, { tx_ref: tx_ref }]
      });

      if (!subscription) {
        console.error('Webhook: Subscription not found for tx_ref:', tx_ref);
        return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
      }

      // Get plan details directly from planDefinitions collection
      const plan = await planDefinitionsCollection.findOne({ slug: subscription.planId });
      if (!plan) {
        console.error(`Webhook: Plan details not found for planId: ${subscription.planId}`);
        return NextResponse.json({ success: false, error: `Plan ${subscription.planId} not found` }, { status: 400 });
      }
      
      const startDate = subscription.startDate || new Date();
      const expiryDate = new Date(startDate);
      
      // Use durationDays from plan for expiry calculation
      if (plan.durationDays && Number(plan.durationDays) > 0) {
        expiryDate.setDate(expiryDate.getDate() + Number(plan.durationDays));
      } else {
        console.warn(`Webhook: Plan ${plan.slug} has invalid durationDays: ${plan.durationDays}. Using default 30 days.`);
        expiryDate.setDate(expiryDate.getDate() + 30);
      }

      await subscriptionsCollection.updateOne(
        { _id: subscription._id },
        {
          $set: {
            status: 'active',
            paymentStatus: 'paid',
            updatedAt: new Date(),
            startDate: startDate,
            endDate: expiryDate,
            transactionRef: tx_ref,
            chapaWebhookData: data,
            chapaVerificationResponse: chapaVerification
          }
        }
      );
      console.log("Webhook: Subscription successfully activated for tx_ref:", tx_ref);
      return NextResponse.json({ success: true, message: "Subscription activated via webhook" });

    } else {
      console.warn("Webhook: Chapa verification failed or was not successful for tx_ref:", tx_ref, chapaVerification);
      const subscriptionsCollection = await getCollection('subscriptions');
      await subscriptionsCollection.updateOne(
        { $or: [{ transactionRef: tx_ref }, { txRef: tx_ref }, { tx_ref: tx_ref }] },
        {
          $set: {
            status: 'failed',
            paymentStatus: 'failed',
            updatedAt: new Date(),
            chapaWebhookData: data,
            chapaVerificationResponse: chapaVerification
          }
        },
        { upsert: false }
      );
      return NextResponse.json({ success: false, error: "Payment verification failed via webhook re-check" }, { status: 400 });
    }

  } catch (error) {
    console.error('Callback POST error (Webhook):', error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
} 