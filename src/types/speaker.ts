import { ImageObject } from "./event"; // Import ImageObject

export interface Speaker {
  id?: string;
  name: string;
  bio?: string;
  avatar?: Partial<ImageObject>; // Standardized to avatar and use Partial<ImageObject>
  role?: string;
  title?: string; // Alternative for role (can keep for flexibility if needed)
  // Removed: image?: string;
  // Removed: photo?: string;
  // Removed: picture?: string;
  description?: string; // Alternative for bio (can keep for flexibility)
  about?: string; // Alternative for bio (can keep for flexibility)
  [key: string]: any; // For any other properties
} 