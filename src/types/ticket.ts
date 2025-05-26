import { ObjectId } from 'mongodb';

export interface TicketDocument {
  _id: ObjectId;
  orderId: ObjectId; // Reference to the order that generated this ticket
  eventId: ObjectId; // Reference to the event this ticket is for
  userId: ObjectId; // Reference to the user who owns this ticket
  ticketHolderFirstName: string; // First name of the ticket holder
  ticketHolderLastName: string; // Last name of the ticket holder
  ticketHolderEmail?: string; // Optional: Email of the ticket holder if different from user
  ticketType: string; // e.g., "General Admission", "VIP", "Free RSVP"
  price: number; // Price paid for this specific ticket (could be 0)
  currency: string; // Currency of the price
  qrCodeValue: string; // Unique value for the QR code, often ticketId.toString()
  status: 'active' | 'used' | 'cancelled' | 'expired'; // Status of the ticket
  isVirtual: boolean; // Is this for a virtual event?
  seatInfo?: string; // Optional: e.g., "Section A, Row 10, Seat 5"
  entryScanTime?: Date; // Optional: Timestamp of when the ticket was scanned for entry
  issuedAt: Date; // Timestamp of when the ticket was issued (effectively createdAt)
  updatedAt: Date; // Timestamp of the last update
  metadata?: Record<string, any>; // Any other custom metadata
} 