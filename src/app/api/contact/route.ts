import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb'; // Import the getCollection function

interface ContactFormRequestBody {
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt?: Date;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ContactFormRequestBody;
    const { name, email, subject, message } = body;

    // Basic validation (can be expanded)
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Get the 'contacts' collection
    const contactsCollection = await getCollection('contacts');

    // Prepare the document to insert
    const contactDocument: ContactFormRequestBody = {
      name,
      email,
      subject,
      message,
      createdAt: new Date(), // Add a timestamp
    };

    // Insert the document into the collection
    const result = await contactsCollection.insertOne(contactDocument);

    if (!result.insertedId) {
      console.error('Failed to insert contact form data', result);
      return NextResponse.json({ message: 'Error saving message to database' }, { status: 500 });
    }

    console.log('Contact form submission saved to database:', result.insertedId);

    return NextResponse.json(
      { 
        message: 'Message received and saved successfully!', 
        data: { ...contactDocument, _id: result.insertedId } 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing contact form:', error);
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ message: 'Error processing request', error: errorMessage }, { status: 500 });
  }
} 