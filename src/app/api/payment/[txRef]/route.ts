// app/api/payments/[txRef]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import axios from 'axios';

const CHAPA_API_URL = 'https://api.chapa.co/v1/transaction/verify';

interface ChapaVerificationResponse {
  status: string;
  data: {
    transaction_id: string;
    tx_ref: string;
    amount: string;
    currency: string;
    status: string;
  };
}

export async function GET(
  request: NextRequest,
  context: { params: { txRef: string } }
) {
  // Validate txRef parameter
  if (!context.params.txRef || typeof context.params.txRef !== 'string') {
    return NextResponse.json(
      { error: 'Invalid transaction reference' },
      { status: 400 }
    );
  }

  try {
    const db = await connectDB();
    
    // Get the payment from database
    const payment = await db.collection('payments').findOne({
      tx_ref: context.params.txRef
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // If payment is pending or processing, verify with Chapa
    if (payment.status === 'pending' || payment.status === 'processing') {
      try {
        const verificationResponse = await axios.get<ChapaVerificationResponse>(
          `${CHAPA_API_URL}/${context.params.txRef}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        const chapaStatus = verificationResponse.data.data.status;
        const currentTime = new Date();

        // Update payment status based on Chapa verification
        const updatedPayment = await db.collection('payments').findOneAndUpdate(
          { tx_ref: context.params.txRef },
          {
            $set: {
              status: chapaStatus === 'success' ? 'success' : 
                     chapaStatus === 'failed' ? 'failed' : payment.status,
              last_verified: currentTime,
              verification_response: verificationResponse.data,
              chapa_transaction_id: verificationResponse.data.data.transaction_id,
              amount_confirmed: verificationResponse.data.data.amount,
              currency_confirmed: verificationResponse.data.data.currency
            }
          },
          { returnDocument: 'after' }
        );

        return NextResponse.json({
          payment: updatedPayment.value,
          verified: true,
          last_verified: currentTime
        });

      } catch (verificationError) {
        // Log verification error but return original payment data
        console.error('Chapa verification error:', verificationError);
        
        return NextResponse.json({
          payment: payment,
          verified: false,
          verification_error: 'Could not verify payment status with provider'
        });
      }
    }

    // If payment is already in a final state (success/failed), return as is
    return NextResponse.json({
      payment: payment,
      verified: true,
      last_verified: payment.last_verified
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment details',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

// Add PATCH endpoint to handle manual status updates if needed
export async function PATCH(
  request: NextRequest,
  context: { params: { txRef: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['pending', 'processing', 'success', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status provided' },
        { status: 400 }
      );
    }

    const db = await connectDB();
    const updatedPayment = await db.collection('payments').findOneAndUpdate(
      { tx_ref: context.params.txRef },
      {
        $set: {
          status: status,
          updated_at: new Date(),
          updated_by: 'manual-update'
        }
      },
      { returnDocument: 'after' }
    );

    if (!updatedPayment.value) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Payment status updated successfully',
      payment: updatedPayment.value
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment status' },
      { status: 500 }
    );
  }
}