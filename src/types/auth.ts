import { Session, User } from "next-auth";
import { JWT } from "next-auth/jwt";
import { ObjectId } from "mongodb";

// Define AppRole enum here
export enum AppRole {
  USER = "user",
  ADMIN = "admin",
  ORGANIZER = "organizer",
}

export interface LoginHistoryEntry {
  timestamp: Date;
  provider: string;
  success: boolean;
  ip?: string | null;
  userId?: ObjectId;
  reason?: string;
}

export interface PasswordHistoryEntry {
  password: string; // Stores the hashed password
  changedAt: Date;
}

export interface UserDocument {
  _id: ObjectId;
  name: string;
  email: string;
  password?: string;
  image?: string | null;
  createdAt: Date;
  updatedAt?: Date; // Add updatedAt field
  lastLogin: Date;
  lastLogout?: Date;
  loginHistory: LoginHistoryEntry[];
  passwordHistory?: PasswordHistoryEntry[]; // Add passwordHistory field
  role?: string;
  isActive?: boolean;
}

export interface LoginAttemptDocument {
  email: string;
  timestamp: Date;
  provider: string;
  success: boolean;
  reason?: string;
  ip?: string | null; 
}

/* Commenting out redundant custom types. 
   Use augmented types from src/types/next-auth.d.ts instead. 

export interface CustomUser extends User {
  id: string;
  _id?: string;
  email: string;
  name: string;
  image?: string | null;
  role?: string;
  accessToken?: string;
}

export interface CustomSession extends Session {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    apiToken: string;
    role?: string;
    isActive: boolean; 
  };
  expires: string;
  accessToken?: string;
  provider?: string;
  expiresAt?: number;
}

export interface CustomJWT extends JWT {
  userId: string;
  name: string | null;
  email: string | null;
  picture?: string | null;
  expiresAt?: number;
  apiToken: string;
}

*/
