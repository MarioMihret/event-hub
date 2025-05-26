// api/payment/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import axios, { AxiosError } from 'axios';
import { TicketDocument } from '@/types/ticket'; // Import the new shared type

interface OrderDocumentForCallback {
    _id: ObjectId;
    userId: ObjectId;
    eventId: ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    currency: string;
    tickets: Array<{
        ticketTypeId: string; // Original ticket type ID from event, or a generic one
        name: string;       // Name of the ticket type, e.g., "General Admission"
        price: number;
        quantity: number;
    }>;
    // Crucial fields for checking and updating order status
    status: string; // e.g., \'pending_payment\', \'COMPLETED\', \'payment_failed\', \'cancelled\'
    paymentStatus?: string; // e.g., \'UNPAID\', \'PAID\', \'FAILED\'
    chapaTxRef?: string;
    paidAt?: Date;
    createdAt: Date; // Assuming these are present
    updatedAt: Date;
    // other order fields could be added if needed by the callback logic
    // Add event details needed for ticket creation if not already present
    eventIsVirtual?: boolean; // To determine if ticket.isVirtual is true/false
}

const CHAPA_API_URL = 'https://api.chapa.co/v1/transaction/verify';

interface ChapaVerificationResponseData {
    transaction_id: string;
    tx_ref: string;
    amount: string; // Chapa returns amount as string
    currency: string;
    status: string; // e.g., "success", "failed"
    // other fields from Chapa...
}
interface ChapaVerificationResponse {
  status: string; // Overall response status, e.g. "success"
  message: string; // e.g. "Payment_verified"
  data: ChapaVerificationResponseData | null; // Data can be null if verification fails at Chapa's end
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const trxRef = url.searchParams.get('trx_ref');
  const chapaStatus = url.searchParams.get('status'); // Status from Chapa redirect query param

  if (!trxRef) { // Removed chapaStatus from required check, will rely on verification API
    return NextResponse.json({ error: 'Missing transaction reference (trx_ref)' }, { status: 400 });
  }

  if (!process.env.CHAPA_SECRET_KEY) {
    console.error('CHAPA_SECRET_KEY not configured');
    return NextResponse.json({ error: 'Payment service configuration error' }, { status: 500 });
  }

  const db = await connectDB();
  const paymentsCollection = db.collection('payments');
  const ordersCollection = db.collection<OrderDocumentForCallback>('orders');
  const ticketsCollection = db.collection<TicketDocument>('tickets');
  const currentTime = new Date();

  try {
    // 1. Verify the transaction with Chapa API
    let verificationResponse;
    try {
        verificationResponse = await axios.get<ChapaVerificationResponse>(
      `${CHAPA_API_URL}/${trxRef}`,
      {
            headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
            timeout: 10000 
        }
        );
    } catch (axiosError: any) {
        console.error(`Chapa verification API call failed for trx_ref ${trxRef}:`, axiosError.message);
        // Update payment record to show verification attempt failed
        await paymentsCollection.updateOne(
            { tx_ref: trxRef }, 
            { $set: { status: 'verification_failed', 'payment_status.current': 'verification_failed', last_verified: currentTime, verification_error: axiosError.message } },
            { upsert: true }
        );
        return NextResponse.json({ error: 'Payment verification with provider failed' }, { status: 502 }); // Bad Gateway
    }

    const chapaVerificationData = verificationResponse.data?.data;
    const chapaOverallStatus = verificationResponse.data?.status;
    const chapaTransactionStatus = chapaVerificationData?.status;

    // Log Chapa response for debugging
    // console.log(`Chapa Verification for ${trxRef}: OverallStatus='${chapaOverallStatus}', TransactionStatus='${chapaTransactionStatus}', Data:`, chapaVerificationData);

    // 2. Update our 'payments' record based on Chapa's definitive response
    const paymentUpdateFields: any = {
      last_verified: currentTime,
      chapa_verification_response: verificationResponse.data, // Store full verification response
    };

    let ourPaymentStatus: 'success' | 'failed' | 'pending' = 'pending';

    if (chapaOverallStatus === 'success' && chapaTransactionStatus === 'success') {
      ourPaymentStatus = 'success';
      paymentUpdateFields.status = 'success';
      paymentUpdateFields['payment_status.current'] = 'success';
      paymentUpdateFields.amount_confirmed = parseFloat(chapaVerificationData!.amount);
      paymentUpdateFields.currency_confirmed = chapaVerificationData!.currency;
      paymentUpdateFields.chapa_transaction_id = chapaVerificationData!.transaction_id;
      paymentUpdateFields.payment_date = currentTime;
    } else {
      ourPaymentStatus = 'failed';
      paymentUpdateFields.status = 'failed';
      paymentUpdateFields['payment_status.current'] = 'failed';
      paymentUpdateFields.failure_reason = verificationResponse.data?.message || 'Verification indicated failure or data mismatch';
    }
    
    const updateDoc = {
      $set: paymentUpdateFields,
      $push: { 
        'payment_status.history': { 
          status: ourPaymentStatus, 
          timestamp: currentTime, 
          detail: `Chapa verification: ${chapaTransactionStatus || 'N/A'}` 
        } 
      }
    } as any; // Cast to any to bypass strict type checking for this dynamic update object

    const updatedPaymentResult = await paymentsCollection.findOneAndUpdate(
      { tx_ref: trxRef },
      updateDoc, 
      { returnDocument: 'after', upsert: true }
    );
    const finalPaymentRecord = updatedPaymentResult;

    if (!finalPaymentRecord) {
        console.error(`CRITICAL: Failed to update/create payment record for trx_ref ${trxRef} after Chapa verification.`);
        return NextResponse.json({ error: 'Internal error processing payment record after verification' }, { status: 500 });
    }

    // 3. If payment was successful, update the Order and create Tickets
    if (ourPaymentStatus === 'success') {
      const orderIdFromPaymentMeta = finalPaymentRecord.metadata?.orderId;
      if (!orderIdFromPaymentMeta || !ObjectId.isValid(orderIdFromPaymentMeta)) {
        console.error(`CRITICAL: Payment successful for trx_ref ${trxRef}, but orderId missing or invalid in payment metadata. Metadata:`, finalPaymentRecord.metadata);
        return NextResponse.json({ error: 'Order linking failed after successful payment.' }, { status: 500 });
      }

      const orderObjectId = new ObjectId(orderIdFromPaymentMeta);
      const updatedOrderResult = await ordersCollection.findOneAndUpdate(
        { _id: orderObjectId, status: 'pending_payment' },
            {
              $set: {
                status: 'COMPLETED',
                paymentStatus: 'PAID',
                chapaTxRef: trxRef,
                paidAt: currentTime,
                updatedAt: currentTime,
              }
            },
            { returnDocument: 'after' }
          );
      
      const completedOrder = updatedOrderResult;

      if (!completedOrder) {
        console.warn(`CRITICAL: Payment successful for trx_ref ${trxRef} (Order ID: ${orderIdFromPaymentMeta}), but corresponding order was not found in 'pending_payment' state or already processed.`);
        const existingOrder = await ordersCollection.findOne({ _id: orderObjectId });
        if (existingOrder && existingOrder.status === 'COMPLETED') {
            console.log(`Order ${orderIdFromPaymentMeta} already marked COMPLETED. Assuming tickets generated or previous callback handled it.`);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/payments/success?orderId=${orderIdFromPaymentMeta}&tx_ref=${trxRef}&status=success&info=already_processed`);
        }
        return NextResponse.json({ error: 'Order update failed after successful payment. Please contact support.' }, { status: 409 });
      }

      console.log(`Order ${completedOrder._id.toString()} successfully updated to COMPLETED.`);

      // ---- Create Ticket Documents ----
      const ticketsToInsert: Omit<TicketDocument, '_id'>[] = [];
      // Fetch event details to determine if it's virtual
      // This is a simplification; in a real app, you might want to ensure event data is more robustly passed or fetched
      const eventDetails = await db.collection('events').findOne({ _id: completedOrder.eventId }, { projection: { isVirtual: 1 } });
      const eventIsVirtual = !!eventDetails?.isVirtual;

      for (const orderedTicket of completedOrder.tickets) {
        for (let i = 0; i < orderedTicket.quantity; i++) {
          const ticketId = new ObjectId(); // Generate unique ID for each ticket
          ticketsToInsert.push({
            orderId: completedOrder._id,
            eventId: completedOrder.eventId,
            userId: completedOrder.userId,
            ticketHolderFirstName: completedOrder.firstName, // From order
            ticketHolderLastName: completedOrder.lastName,  // From order
            ticketHolderEmail: completedOrder.email, // Can be used if ticket holder is same as order placer
            ticketType: orderedTicket.name, // From the order's ticket line item
            price: orderedTicket.price,
            currency: completedOrder.currency, // from order
            qrCodeValue: ticketId.toString(), // Use ticket's own ID for QR
            status: 'active',
            isVirtual: eventIsVirtual, // Set based on event detail
            issuedAt: currentTime,
            updatedAt: currentTime,
            // metadata: { source: 'paid_chapa' } // Example metadata
          });
        }
      }

      if (ticketsToInsert.length > 0) {
        try {
            await ticketsCollection.insertMany(ticketsToInsert as TicketDocument[]);
            console.log(`Successfully inserted ${ticketsToInsert.length} tickets for order ${completedOrder._id.toString()}.`);
        } catch (ticketInsertError) {
            console.error(`CRITICAL: Failed to insert tickets for order ${completedOrder._id.toString()} after successful payment and order update. Error:`, ticketInsertError);
            // TODO: This is a partial failure. Payment is done, order updated, but tickets failed.
            // Implement retry or manual flagging for this order.
            // For now, proceed to redirect but log this critical error.
        }
      }
      // ---- End Ticket Creation ----

      // Redirect to appropriate page based on event type
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const successRedirectUrl = new URL(`${baseUrl}/payments/success`);
      successRedirectUrl.searchParams.append('orderId', completedOrder._id.toString());
      successRedirectUrl.searchParams.append('tx_ref', trxRef);
      successRedirectUrl.searchParams.append('status', 'success');
      
      if (eventIsVirtual) {
        successRedirectUrl.searchParams.append('eventType', 'virtual');
        successRedirectUrl.searchParams.append('eventId', completedOrder.eventId.toString());
        
        // Directly build virtual event URL without URL encoding issues
        const meetingUrl = new URL(`${baseUrl}/payments/meeting`);
        meetingUrl.searchParams.append('source', 'payment_success');
        meetingUrl.searchParams.append('eventId', completedOrder.eventId.toString());
        meetingUrl.searchParams.append('orderId', completedOrder._id.toString());
        return NextResponse.redirect(meetingUrl.toString());
      } else {
        successRedirectUrl.searchParams.append('eventType', 'location');
        // For location events, optionally redirect directly to ticket page with success message
        if (process.env.DIRECT_TICKET_REDIRECT === 'true') {
          // Directly build ticket URL without URL encoding issues
          const ticketUrl = new URL(`${baseUrl}/payments/ticket`);
          ticketUrl.searchParams.append('orderId', completedOrder._id.toString());
          ticketUrl.searchParams.append('source', 'payment_success');
          return NextResponse.redirect(ticketUrl.toString());
        }
      }
      
      // Add source parameter to help with success messages
      successRedirectUrl.searchParams.append('source', 'payment_success');
      
      return NextResponse.redirect(successRedirectUrl.toString());

    } else { // Payment failed or status from Chapa was not success
        const orderIdFromPaymentMeta = finalPaymentRecord.metadata?.orderId;
        if (orderIdFromPaymentMeta && ObjectId.isValid(orderIdFromPaymentMeta)) {
            // Optionally update the order to a 'payment_failed' status
            await ordersCollection.updateOne(
                { _id: new ObjectId(orderIdFromPaymentMeta), status: 'pending_payment' },
                { $set: { status: 'payment_failed', paymentStatus: 'FAILED', updatedAt: currentTime } }
            );
            console.log(`Order ${orderIdFromPaymentMeta} marked as payment_failed due to Chapa status.`);
        }
        // Redirect to a failure page on your frontend
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const failureRedirectUrl = new URL(`${baseUrl}/payments/failure`);
        failureRedirectUrl.searchParams.append('tx_ref', trxRef);
        failureRedirectUrl.searchParams.append('reason', finalPaymentRecord.failure_reason || 'Payment was not successful with the provider.');
        if(orderIdFromPaymentMeta) failureRedirectUrl.searchParams.append('orderId', orderIdFromPaymentMeta);
        return NextResponse.redirect(failureRedirectUrl.toString());
    }

  } catch (error) {
    console.error(`Generic error in Chapa callback for trx_ref ${trxRef}:`, error);
    // This is a fallback for unexpected errors in the callback logic itself
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const errorRedirectUrl = new URL(`${baseUrl}/payments/failure`);
    errorRedirectUrl.searchParams.append('error', 'An unexpected error occurred during payment processing.');
    if (trxRef) errorRedirectUrl.searchParams.append('tx_ref', trxRef);
    return NextResponse.redirect(errorRedirectUrl.toString());
  }
}