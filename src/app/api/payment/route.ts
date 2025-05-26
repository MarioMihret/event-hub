// api/payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { connectDB } from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { User } from "next-auth";
import { ObjectId, Document } from 'mongodb';

const ALLOWED_CURRENCIES = ['ETB', 'USD'] as const;
type AllowedCurrency = typeof ALLOWED_CURRENCIES[number];

// Define an interface for the payment status history entries
interface PaymentStatusHistoryEntry {
  status: 'initiated' | 'pending' | 'success' | 'failed' | 'failed_initialization';
  timestamp: Date;
  detail: string;
}

// Define an interface for the main Payment document (optional, but good practice)
interface PaymentDocument extends Document {
  _id: ObjectId;
  tx_ref: string;
  orderId: ObjectId;
  userId: ObjectId;
  eventId: ObjectId;
  amount: number;
  currency: AllowedCurrency;
  email: string;
  status: 'initiated' | 'pending' | 'success' | 'failed' | 'failed_initialization';
  payment_status: {
    current: 'initiated' | 'pending' | 'success' | 'failed' | 'failed_initialization';
    history: PaymentStatusHistoryEntry[];
  };
  expected_amount: number;
  metadata: any; // Define more strictly if possible
  request_id: string;
  created_at: Date;
  updated_at: Date;
  callback_url: string;
  return_url: string;
  chapa_data: any; // Define more strictly if possible
}

interface PaymentRequestBody {
  amount: number;
  currency: AllowedCurrency;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  callback_url: string;
  return_url?: string;
  redirect_on_empty_email?: boolean;
  metadata?: Record<string, any>;
  customization?: {
    title?: string;
    description?: string;
  };
  eventId: string;
  tickets: Array<{
    ticketId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

const validatePaymentData = (data: any): data is PaymentRequestBody => {
  const errors: string[] = [];

  if (data.redirect_on_empty_email === true) {
    if (data.email && !validateEmail(data.email)) {
      errors.push('Invalid email address format');
    }
  } else {
    if (!data.email || !validateEmail(data.email)) {
      errors.push('Invalid or missing email address');
    }
  }

  if (!data.amount || isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) {
    errors.push('Invalid or missing amount');
  }

  if (!data.currency || !ALLOWED_CURRENCIES.includes(data.currency)) {
    errors.push(`Invalid currency. Allowed currencies: ${ALLOWED_CURRENCIES.join(', ')}`);
  }

  if (!data.callback_url || !isValidUrl(data.callback_url)) {
    errors.push('Invalid or missing callback URL');
  }

  if (data.return_url && !isValidUrl(data.return_url)) {
    errors.push('Invalid return URL');
  }

  if (!data.eventId || !ObjectId.isValid(data.eventId)) {
    errors.push('Missing or invalid eventId');
  }

  if (!data.tickets || !Array.isArray(data.tickets) || data.tickets.length === 0) {
    errors.push('Missing or invalid tickets information');
  } else {
    for (const ticket of data.tickets) {
      if (ticket.quantity == null || ticket.quantity <= 0 || ticket.price == null || ticket.price < 0) {
        errors.push('Invalid ticket quantity or price');
      }
    }
  }

  if (errors.length > 0) {
    console.warn('Payment data validation failed:', errors);
    return false;
  }
  return true;
};

function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = uuidv4();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: User not logged in.', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    const user = session.user as User;
    const userId = new ObjectId(user.id);

    const body: PaymentRequestBody = await request.json();
    console.log(`[${requestId}] Payment initialization request for user ${userId}:`, body);

    if (!validatePaymentData(body)) {
      return NextResponse.json({
        error: 'Validation failed',
        message: 'Invalid payment data provided'
      }, { status: 400 });
    }

    const db = await connectDB();
    const ordersCollection = db.collection('orders');
    const paymentsCollection = db.collection<PaymentDocument>('payments'); // Use the defined interface

    // 1. Create an Order document first
    const newOrder = {
      _id: new ObjectId(),
      userId: userId,
      eventId: new ObjectId(body.eventId),
      firstName: body.firstName || user.name?.split(' ')[0] || 'N/A',
      lastName: body.lastName || user.name?.split(' ').slice(1).join(' ') || 'N/A',
      email: body.email,
      phone: body.phone || '',
      amount: body.amount,
      currency: body.currency,
      status: 'pending_payment',
      paymentStatus: 'UNPAID',
      orderType: 'PAID_EVENT',
      tickets: body.tickets.map(t => ({
        ticketTypeId: t.ticketId,
        name: t.name,
        price: t.price,
        quantity: t.quantity,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertedOrder = await ordersCollection.insertOne(newOrder);
    if (!insertedOrder.insertedId) {
      console.error(`[${requestId}] Failed to insert new order into database for user ${userId}, event ${body.eventId}`);
      return NextResponse.json({ error: 'Order creation failed', message: 'Could not initiate the order process.' }, { status: 500 });
    }
    const orderId = newOrder._id;
    console.log(`[${requestId}] Created order ${orderId.toString()} with status 'pending_payment'.`);

    const tx_ref = `CHAPA-${orderId.toString()}-${Date.now()}`;

    const existingPaymentForTxRef = await paymentsCollection.findOne({ tx_ref });
    if (existingPaymentForTxRef) {
      console.warn(`[${requestId}] Duplicate tx_ref generated or found: ${tx_ref}. This should be rare.`)
      return NextResponse.json({
        error: 'Duplicate transaction reference',
        message: 'This transaction reference already exists, please try again.'
      }, { status: 409 });
    }

    const paymentDataForChapa = {
      amount: typeof body.amount === 'number' ? body.amount.toString() : body.amount,
      currency: body.currency,
      email: body.email,
      first_name: body.firstName || user.name?.split(' ')[0] || "Guest",
      last_name: body.lastName || user.name?.split(' ').slice(1).join(' ') || "User",
      phone_number: body.phone || "",
      tx_ref,
      callback_url: body.callback_url,
      return_url: body.return_url || `${process.env.NEXT_PUBLIC_BASE_URL}/payments/success?orderId=${orderId.toString()}`,
      title: body.customization?.title || "Event Ticket Payment",
      description: body.customization?.description || `Payment for order ${orderId.toString()}`,
      meta: {
        orderId: orderId.toString(),
        eventId: body.eventId,
        userId: userId.toString(),
        ...(body.metadata || {})
      }
    };

    const initialHistoryEntry: PaymentStatusHistoryEntry = {
      status: 'initiated',
      timestamp: new Date(),
      detail: 'Payment initialization started'
    };

    const paymentRecord: Omit<PaymentDocument, '_id'> = {
      tx_ref,
      orderId: orderId,
      userId: userId,
      eventId: new ObjectId(body.eventId),
      amount: typeof body.amount === 'string' ? parseFloat(body.amount) : body.amount,
      currency: body.currency,
      email: body.email,
      status: 'initiated',
      payment_status: {
        current: 'initiated',
        history: [initialHistoryEntry]
      },
      expected_amount: typeof body.amount === 'string' ? parseFloat(body.amount) : body.amount,
      metadata: paymentDataForChapa.meta,
      request_id: requestId,
      created_at: new Date(),
      updated_at: new Date(),
      callback_url: body.callback_url,
      return_url: paymentDataForChapa.return_url,
      chapa_data: null,
    };
    
    // Insert and get the _id if needed, or let MongoDB handle it
    const insertedPayment = await paymentsCollection.insertOne(paymentRecord as PaymentDocument);
    const paymentRecordId = insertedPayment.insertedId;

    console.log(`[${requestId}] Created payment record ${paymentRecordId.toString()} for order ${orderId.toString()} with status 'initiated'.`);

    const chapaResponse = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      paymentDataForChapa,
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    
    const pendingHistoryEntry: PaymentStatusHistoryEntry = {
      status: 'pending',
      timestamp: new Date(),
      detail: 'Payment initialized with Chapa, user redirected.'
    };

    await paymentsCollection.updateOne(
      { _id: paymentRecordId }, // Use the insertedId
      {
        $set: {
          status: 'pending',
          'payment_status.current': 'pending',
          chapa_data: {
            checkout_url: chapaResponse.data?.data?.checkout_url,
            initialization_response: chapaResponse.data,
            initialization_date: new Date()
          },
          updated_at: new Date()
        },
        $push: { 'payment_status.history': pendingHistoryEntry } as any
      }
    );
     console.log(`[${requestId}] Updated payment record ${paymentRecordId.toString()} to 'pending' after Chapa init.`);

    console.log(`[${requestId}] Payment initialized successfully with Chapa in ${Date.now() - startTime}ms. Order ID: ${orderId.toString()}, Tx_Ref: ${tx_ref}`);

    return NextResponse.json({
      message: "Payment initialized successfully",
      checkout_url: chapaResponse.data?.data?.checkout_url,
      orderId: orderId.toString(),
      tx_ref: tx_ref,
      chapa_response_status: chapaResponse.data?.status,
      requires_email: body.redirect_on_empty_email === true && !body.email
    }, { 
      status: 200,
      headers: {
        'X-Request-ID': requestId
      }
    });

  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error(`[${requestId}] Payment initialization failed after ${Date.now() - startTime}ms:`, errorMessage, error.stack);
    
    const db = await connectDB(); // Ensure db is available for logging
    const failedInitCollection = db.collection('failed_payment_initializations');
    try {
      const failedPaymentRecord = {
        request_id: requestId,
        error: errorMessage,
        request_body: "Request body unavailable - already consumed", // Don't attempt to read body again
        timestamp: new Date(),
        stack_trace: error.stack,
        status: 'failed_initialization',
        payment_status: {
          current: 'failed_initialization',
          history: [{ status: 'failed_initialization' as const, timestamp: new Date(), detail: errorMessage }]
        }
      };
      await failedInitCollection.insertOne(failedPaymentRecord);
    } catch (dbError) {
      console.error(`[${requestId}] Failed to log payment initialization error to database:`, dbError);
    }

    return NextResponse.json({
      error: 'Payment initialization failed',
      message: errorMessage,
      request_id: requestId,
    }, { 
      status: error.response?.status || 500,
      headers: {
        'X-Request-ID': requestId
      }
    });
  }
}