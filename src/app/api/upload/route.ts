import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryFolder } from '@/utils/cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary with the provided credentials
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'meetspace',
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '187511717157178',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'vbFz8GlVx7eYTHsKhvnjrJr7FX4',
  secure: true
});

// Helper function to convert buffer to readable stream (needed for cloudinary)
const bufferToStream = (buffer: Buffer) => {
  const readable = new Readable();
  readable._read = () => {}; // _read is required but we don't need to implement it
  readable.push(buffer);
  readable.push(null);
  return readable;
};

// Helper function for file validation
const validateFileType = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
  return validTypes.includes(file.type);
};

// Helper function for file size validation (max 5MB)
const validateFileSize = (file: File): boolean => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return file.size <= maxSize;
};

// Function to handle upload with retry logic
const uploadToCloudinaryWithRetry = async (
  buffer: Buffer, 
  options: any, 
  maxRetries = 2
): Promise<any> => {
  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts <= maxRetries) {
    try {
      // Add timeout handling with Promise.race
      const result = await Promise.race([
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { 
              ...options,
              timeout: 60000, // 60 second timeout
              upload_preset: 'ml_default' // Add the upload preset
            },
            (error, result) => {
              if (error || !result) {
                const errorMessage = error?.message || 'Upload failed without error details';
                console.error(`Cloudinary upload error: ${errorMessage}`);
                reject(error || new Error(errorMessage));
                return;
              }
              resolve(result);
            }
          );

          // Create a new stream for each attempt
          const stream = bufferToStream(buffer);
          stream.pipe(uploadStream);
        }),
        // Add a local timeout as a fallback
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Local timeout reached after 65 seconds'));
          }, 65000); // Set a slightly longer local timeout
        })
      ]);

      console.log(`Upload successful on attempt ${attempts + 1}`);
      return result;
    } catch (error) {
      attempts++;
      
      // Improve error message with more details
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown upload error';
      
      // Include more error details if available
      const detailedError = error instanceof Error && (error as any).http_code 
        ? `HTTP ${(error as any).http_code}: ${errorMessage}` 
        : errorMessage;
      
      lastError = new Error(detailedError);
      console.error(`Upload attempt ${attempts} failed: ${detailedError}`);
      
      // Log the full error object for debugging
      console.error('Full error details:', error);
      
      if (attempts <= maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s... longer delays
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error('Upload failed after multiple attempts');
};

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called');
    // Parse the multipart form data
    const formData = await request.formData();

    // Get the file and folder from the form data
    const file = formData.get('file') as File;
    const folderName = formData.get('folder') as string;
    
    // Get attribution metadata if provided
    const attributionString = formData.get('attribution') as string;
    let attribution = null;
    
    if (attributionString) {
      try {
        attribution = JSON.parse(attributionString);
        console.log('Attribution metadata provided:', attribution);
      } catch (err) {
        console.warn('Failed to parse attribution metadata:', err);
      }
    }

    // Validate inputs
    if (!file) {
      console.error('Upload error: No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!folderName || !Object.values(CloudinaryFolder).includes(folderName as CloudinaryFolder)) {
      console.error(`Upload error: Invalid folder ${folderName}`);
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }

    // Validate file type
    if (!validateFileType(file)) {
      console.error(`Upload error: Invalid file type ${file.type}`);
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload an image (JPG, PNG, WebP, or GIF)' 
      }, { status: 400 });
    }

    // Validate file size
    if (!validateFileSize(file)) {
      console.error(`Upload error: File too large ${file.size} bytes`);
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB' 
      }, { status: 400 });
    }

    console.log(`Processing upload for ${file.name} (${file.size} bytes) to ${folderName}`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create upload options
    const uploadOptions: any = {
      folder: folderName,
      resource_type: 'auto',
      transformation: [
        { width: 1200, crop: 'limit' },
        { quality: 'auto:good' }
      ]
    };
    
    // Add context metadata for attribution if provided
    if (attribution) {
      uploadOptions.context = {
        alt: attribution.source ? `Photo by ${attribution.name} on ${attribution.source}` : '',
        attribution: JSON.stringify(attribution)
      };
    }

    // Upload with retry logic
    try {
      const uploadResult = await uploadToCloudinaryWithRetry(
        buffer,
        uploadOptions
      );

      console.log(`Upload success: ${uploadResult.public_id}`);
      
      // Add attribution to the response if it was provided
      if (attribution) {
        uploadResult.attribution = attribution;
      }

      // Return the upload result
      return NextResponse.json(uploadResult);
    } catch (uploadError) {
      // Handle Cloudinary-specific errors
      console.error('Cloudinary upload error:', uploadError);
      
      const errorMessage = uploadError instanceof Error 
        ? uploadError.message
        : 'Upload to cloud storage failed';
        
      return NextResponse.json({ 
        error: errorMessage,
        details: 'Failed to upload image to cloud storage'
      }, { status: 500 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
    console.error('Upload API general error:', errorMessage);
    
    // Include stack trace in development
    const errorDetails = error instanceof Error && process.env.NODE_ENV === 'development' 
      ? error.stack 
      : undefined;
      
    return NextResponse.json({ 
      error: errorMessage,
      ...(errorDetails && { stack: errorDetails })
    }, { status: 500 });
  }
}

// The Pages Router 'config' for bodyParser is not used in App Router.
// FormData is handled directly. Payload size limits for serverless functions
// are typically configured at the platform level (e.g., Vercel project settings or vercel.json)
// if they need to be adjusted beyond defaults.
// export const config = {
//   api: {
//     bodyParser: {
//       sizeLimit: '10mb',
//     },
//   },
// };
