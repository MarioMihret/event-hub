import { MongoClient, Db, Collection, Document, ServerApiVersion } from 'mongodb';
import { MONGODB } from '@/constants/auth';

// Database connection string
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/event';

// Connection options
const options = {
  maxPoolSize: 20, // Increased from 10
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
};

// Client and DB state - use module scope for singleton
let client: MongoClient | null = null;
let db: Db | null = null;
let isDbSetup = false;
let isConnecting = false;
let connectionPromise: Promise<MongoClient> | null = null;

// Create a singleton MongoClient promise
const getMongoClientPromise = () => {
  if (connectionPromise) return connectionPromise;
  
  if (!client) {
    isConnecting = true;
    connectionPromise = MongoClient.connect(uri, options)
      .then((connectedClient) => {
        client = connectedClient;
        db = client.db();
        isConnecting = false;
        console.log('MongoDB connection established successfully');
        return connectedClient;
      })
      .catch((error) => {
        isConnecting = false;
        connectionPromise = null;
        console.error('MongoDB connection error:', error);
        throw error;
      });
    
    return connectionPromise;
  }
  
  return Promise.resolve(client);
};

// Export the clientPromise for backward compatibility with auth.ts
export const clientPromise = getMongoClientPromise();

// Function to set up database indices
async function setupDatabaseIndices(db: Db) {
  try {
    console.log('Setting up database indices...');
    
    await Promise.all([
      // Events collection indices
      db.collection('events').createIndex({ date: 1 }),
      db.collection('events').createIndex({ category: 1 }),
      db.collection('events').createIndex({ organizerId: 1 }),
      db.collection('events').createIndex({ status: 1 }),
      db.collection('events').createIndex({ "visibility.status": 1 }),
      db.collection('events').createIndex({ visibility: 1 }),
      
      // Combined indices for frequent queries
      db.collection('events').createIndex({ organizerId: 1, date: 1 }),
      db.collection('events').createIndex({ category: 1, date: 1 }),
      db.collection('events').createIndex({ status: 1, date: 1 }),
      
      // Text search index
      db.collection('events').createIndex({ 
        title: "text", 
        description: "text",
        shortDescription: "text"
      }, { 
        name: "events_text_search",
        weights: {
          title: 10,
          shortDescription: 5,
          description: 1
        }
      }),
      
      // Users collection indices
      db.collection(MONGODB.collections.users).createIndex({ email: 1 }, { unique: true }),
      db.collection(MONGODB.collections.users).createIndex({ username: 1 }),
      db.collection(MONGODB.collections.users).createIndex({ role: 1 }),
      
      // Orders collection indices
      db.collection('orders').createIndex({ userId: 1 }),
      db.collection('orders').createIndex({ eventId: 1 }),
      db.collection('orders').createIndex({ status: 1 }),
      db.collection('orders').createIndex({ orderType: 1 }),
      db.collection('orders').createIndex({ "userId": 1, "eventId": 1 }),
      db.collection('orders').createIndex({ tx_ref: 1 }, { unique: true, sparse: true }),

      // Payments collection indices
      db.collection('payments').createIndex({ tx_ref: 1 }, { unique: true }),
      db.collection('payments').createIndex({ email: 1 }),
      db.collection('payments').createIndex({ status: 1 }),
      db.collection('payments').createIndex({ "metadata.eventId": 1 }),
      db.collection('payments').createIndex({ "metadata.orderId": 1 }),

      // Tickets collection indices
      db.collection('tickets').createIndex({ orderId: 1 }),
      db.collection('tickets').createIndex({ eventId: 1 }),
      db.collection('tickets').createIndex({ userId: 1 }),
      db.collection('tickets').createIndex({ qrCodeValue: 1 }, { unique: true }),
      db.collection('tickets').createIndex({ status: 1 }),
      db.collection('tickets').createIndex({ "userId": 1, "eventId": 1 }),
      
      // Add indexes for applications collection
      db.collection('organizer_applications').createIndex({ email: 1 }),
      db.collection('organizer_applications').createIndex({ status: 1 }),
      
      // Add indexes for subscriptions collection
      db.collection('subscriptions').createIndex({ userId: 1 }),
      db.collection('subscriptions').createIndex({ status: 1 }),
      db.collection('subscriptions').createIndex({ endDate: 1 }),

      // EventLikes collection indices (NEW)
      db.collection('eventLikes').createIndex({ eventId: 1 }),
      db.collection('eventLikes').createIndex({ userId: 1 }),
      db.collection('eventLikes').createIndex({ eventId: 1, userId: 1 }, { unique: true })
    ]);
    
    console.log('Database indices setup complete');
    isDbSetup = true;
  } catch (error) {
    console.error('Error setting up database indices:', error);
    throw error;
  }
}

// Connect to MongoDB
export async function connectDB(): Promise<Db> {
  // If we already have a database connection, return it immediately
  if (db) return db;
  
  // If we're in the process of connecting, wait for that to complete
  if (isConnecting && connectionPromise) {
    await connectionPromise;
    return db!;
  }

  // Otherwise connect
  try {
    const connectedClient = await getMongoClientPromise();
    
    // Get the database
    if (!db) {
      db = connectedClient.db();
    }
    
    // Setup database indices if not already done
    // Now create indexes in both dev and prod for consistent performance
    if (!isDbSetup) {
      await setupDatabaseIndices(db);
    }
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Get a database connection
export async function getDbConnection(): Promise<Db> {
  return await connectDB();
}

// Get a collection
export async function getCollection<T extends Document = Document>(collectionName: string): Promise<Collection<T>> {
  const db = await connectDB();
  return db.collection<T>(collectionName);
}

// Singleton pattern to ensure we only have one connection
export default {
  connectDB,
  getDbConnection,
  getCollection
};

