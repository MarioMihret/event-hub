// utils/fileUpload.ts
import { CloudinaryFolder } from './cloudinary';

export interface Attribution {
  name: string;
  url: string;
  source: string;
  sourceUrl: string;
}

export interface UploadResult {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  resource_type: string;
  attribution?: Attribution;
}

export interface UploadOptions {
  attribution?: Attribution;
}

/**
 * Upload a file to Cloudinary via the API route
 * @param file The file to upload
 * @param folder The Cloudinary folder to store the file in
 * @param options Additional options like attribution metadata
 * @returns Promise with upload result including secure URL
 */
export const uploadFile = async (
  file: File, 
  folder: CloudinaryFolder,
  options?: UploadOptions
): Promise<UploadResult> => {
  try {
    // Set a flag to prevent form submission during upload
    if (typeof window !== 'undefined') {
      // Add a flag to indicate we're in an upload process
      // This will be checked by the form's submit handler
      (window as any).__IS_UPLOADING_FILE__ = true;
      console.log('Upload in progress - set __IS_UPLOADING_FILE__ flag to true');
      
      // Provide visual indication for debugging
      document.body.classList.add('file-uploading');
      
      // Clean up after 3 minutes max (failsafe)
      setTimeout(() => {
        (window as any).__IS_UPLOADING_FILE__ = false;
        document.body.classList.remove('file-uploading');
        console.log('Upload timeout reached - cleared __IS_UPLOADING_FILE__ flag');
      }, 180000); // 3 minutes
    }
    
    if (!file) {
      throw new Error('No file provided');
    }

    // Create form data for the API request
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    // Add attribution metadata if provided
    if (options?.attribution) {
      formData.append('attribution', JSON.stringify(options.attribution));
    }

    // Send the upload request to the API route
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Improve error handling to gracefully handle non-JSON responses
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
      } catch (parseError) {
        // If JSON parsing fails, use the status text or a generic error message
        throw new Error(`Upload failed: ${response.statusText || `Error ${response.status}`}`);
      }
    }

    // Parse the response
    const result: UploadResult = await response.json();

    // Add attribution to the result if it was provided in options
    if (options?.attribution && !result.attribution) {
      result.attribution = options.attribution;
    }

    // Reset the uploading flag
    if (typeof window !== 'undefined') {
      (window as any).__IS_UPLOADING_FILE__ = false;
      document.body.classList.remove('file-uploading');
      console.log('Upload complete - cleared __IS_UPLOADING_FILE__ flag');
    }

    return result;
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Reset the uploading flag even on error
    if (typeof window !== 'undefined') {
      (window as any).__IS_UPLOADING_FILE__ = false;
      document.body.classList.remove('file-uploading');
      console.log('Upload error - cleared __IS_UPLOADING_FILE__ flag');
    }
    
    throw error;
  }
};

/**
 * Validate a file before upload
 * @param file The file to validate
 * @param maxSizeInMB Maximum file size in MB (default: 5MB)
 * @param allowedTypes Array of allowed MIME types
 * @returns Object with validation result and error message if any
 */
export const validateFile = (
  file: File,
  maxSizeInMB = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }

  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return { 
      valid: false, 
      error: `File size exceeds limit (${maxSizeInMB}MB)` 
    };
  }

  return { valid: true };
};