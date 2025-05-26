import { ObjectId } from 'mongodb';

/* IUser and SafeUser are being commented out to prefer UserDocument from @/types/auth.ts as the primary user model.
   If SafeUser is needed for specific client-side display, it should be derived from UserDocument.

export interface IUser {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
}

export const createSafeUser = (user: IUser): SafeUser => ({
  id: user._id?.toString() || '',
  name: user.name,
  email: user.email,
});

*/

// It is recommended to ensure all user-related database operations and type definitions
// consistently use UserDocument from '@/types/auth.ts' to avoid discrepancies.