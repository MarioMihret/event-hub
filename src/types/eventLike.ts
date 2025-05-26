import { ObjectId } from 'mongodb';

export interface EventLikeDocument {
  _id: ObjectId;
  eventId: ObjectId;
  userId: ObjectId;
  createdAt: Date;
}

// You might also want a version for API responses where ObjectIds are strings:
export interface EventLikeApiResponse {
  _id: string;
  eventId: string;
  userId: string;
  createdAt: string;
} 