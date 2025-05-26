import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables or fallback to hardcoded values
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'meetspace',
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '187511717157178',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'vbFz8GlVx7eYTHsKhvnjrJr7FX4',
  secure: true
});

// Types for upload response
export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  resource_type: string;
}

// Enum for upload folder organization
export enum CloudinaryFolder {
  EVENT_IMAGES = 'event_images',
  EVENT_LOGOS = 'event_logos',
  SPEAKER_PHOTOS = 'speaker_photos'
}

/**
 * Uploads a file to Cloudinary
 * @param file The file to upload
 * @param folder The folder to upload to
 * @returns Promise with the upload response
 */
export const uploadToCloudinary = async (
  file: File | Blob | Buffer,
  folder: CloudinaryFolder
): Promise<CloudinaryUploadResponse> => {
  // For client-side: convert File/Blob to base64
  // For server-side: use the buffer directly
  let uploadData: any; // Use any for cloudinary's mismatched types
  
  if (Buffer.isBuffer(file)) {
    // Server-side with Buffer
    uploadData = file;
  } else {
    // Client-side with File/Blob
    uploadData = await fileToBase64(file as File | Blob);
  }
  
  return new Promise((resolve, reject) => {
    // Cloudinary's types are incorrect but it accepts Buffer or string
    cloudinary.uploader.upload(
      uploadData,
      {
        folder,
        resource_type: 'auto',
        transformation: [
          { width: 1200, crop: 'limit' }, // Resize for better performance
          { quality: 'auto:good' } // Optimize quality
        ]
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Upload failed'));
          return;
        }
        
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          format: result.format,
          width: result.width,
          height: result.height,
          resource_type: result.resource_type
        });
      }
    );
  });
};

/**
 * Helper function to convert File to base64 string - isomorphic implementation
 * Works in both browser and Node.js environments
 */
const fileToBase64 = (file: File | Blob): Promise<string> => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined' && typeof FileReader !== 'undefined';
  
  if (isBrowser) {
    // Browser implementation using FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  } else {
    // Server implementation
    // This should never be called in practice because on the server we should
    // be handling buffers directly, but adding as a fallback
    throw new Error('Direct file to base64 conversion is not supported on the server. Use a Buffer instead.');
  }
};

/**
 * Deletes an image from Cloudinary by public_id
 */
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error || !result) {
        reject(error || new Error('Deletion failed'));
        return;
      }
      
      resolve(result.result === 'ok');
    });
  });
}; 