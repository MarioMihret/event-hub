import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { ObjectId, Document } from 'mongodb';
import { TicketDocument } from '@/types/ticket';
import { User } from 'next-auth';

// Define a minimal Order type for this route's needs
interface OrderForTicketVerification extends Document {
  _id: ObjectId;
  userId: ObjectId; // Or string, depending on how it's stored and compared
  // Add other fields if needed for verification, though userId is primary here
}

export async function GET(request: NextRequest, context: { params: { orderId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const typedUser = session?.user as User | undefined;

    if (!typedUser?.id) {
      return NextResponse.json({ error: 'Unauthorized: User not logged in.' }, { status: 401 });
    }
    const sessionUserIdString = typedUser.id;

    const orderId = context.params.orderId;

    if (!orderId || !ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID format.' }, { status: 400 });
    }
    const orderObjectId = new ObjectId(orderId);

    const db = await connectDB();
    const ordersCollection = db.collection<OrderForTicketVerification>('orders');

    const order = await ordersCollection.findOne({ _id: orderObjectId });

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }
    
    // Ensure sessionUserIdString is compared correctly with order.userId
    // If order.userId is stored as ObjectId, convert it to string for comparison.
    // If session.user.id is already the string form of ObjectId, this is fine.
    if (order.userId.toString() !== sessionUserIdString) {
        return NextResponse.json({ error: 'Access Denied: You do not have permission to view these tickets.' }, { status: 403 });
    }

    const tickets = await db.collection<TicketDocument>('tickets').find({ orderId: orderObjectId }).toArray();

    if (!tickets || tickets.length === 0) {
      // It's possible an order exists but tickets weren't generated, though unlikely with current flow
      // Sending 200 with empty array is fine, or a 404 if tickets are expected.
      return NextResponse.json({ message: 'No tickets found for this order.', tickets: [] }, { status: 200 });
    }

    return NextResponse.json({ tickets }, { status: 200 });

  } catch (error: any) {
    const idForErrorLog = context.params?.orderId || 'unknown_orderId';
    console.error(`Error fetching tickets for orderId ${idForErrorLog}:`, error);
    return NextResponse.json({ error: 'Failed to fetch tickets.', details: error.message }, { status: 500 });
  }
} 