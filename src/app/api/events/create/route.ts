import { NextRequest, NextResponse } from 'next/server';
import { eventService } from '@/lib/services/eventService';
import { connectDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { createJaaSMeetingUrl, generateJitsiRoomName } from "@/utils/jitsi";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { CreateEventInput, EventCategory, EventSkillLevel, EventStatus, EventVisibilityType, StreamingPlatform, ImageObject } from '@/types/event';
import { subscriptionService } from '@/lib/services/subscriptionService';

// Import Cloudinary
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary - place this at the top level of the module
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error("CRITICAL: Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not fully set. Image uploads will fail.");
  // Depending on the desired behavior, you might want to throw an error here
  // to prevent the application from starting/running with a misconfiguration.
  // throw new Error("Cloudinary configuration is incomplete.");
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

// Helper function to upload image to Cloudinary
async function uploadToCloudinary(file: File, folder: string): Promise<{ url: string; publicId: string } | null> {
  try {
    const fileBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(fileBuffer).toString('base64');
    const dataUri = `data:${file.type};base64,${base64Image}`;

    const uploadResponse = await cloudinary.uploader.upload(dataUri, {
      folder: folder,
      // resource_type: "image", // auto-detects usually
    });
    return { url: uploadResponse.secure_url, publicId: uploadResponse.public_id };
  } catch (error) {
    console.error(`Cloudinary Upload Error in folder ${folder}:`, error);
    return null;
  }
}

// --- Placeholder for your actual file upload logic ---
// You'll need to replace this with your actual Cloudinary (or other service) upload function
async function uploadFileToCloudinary(file: File): Promise<{ url: string; public_id: string; width?: number; height?: number }> {
  // This is a mock. Implement your actual upload logic here.
  // For example, using the Cloudinary SDK:
  // const arrayBuffer = await file.arrayBuffer();
  // const buffer = new Uint8Array(arrayBuffer);
  // const uploadResult = await new Promise((resolve, reject) => {
  //   cloudinary.uploader.upload_stream({ resource_type: "auto" }, (error, result) => {
  //     if (error) reject(error);
  //     else resolve(result);
  //   }).end(buffer);
  // });
  // return { url: uploadResult.secure_url, public_id: uploadResult.public_id, width: uploadResult.width, height: uploadResult.height };

  console.log(`[UPLOAD_PLACEHOLDER] Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);
  // Simulate upload and return a placeholder URL and public_id
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  const mockPublicId = `mock_public_id_${Date.now()}_${file.name.split('.').shift()}`;
  const mockUrl = `https://res.cloudinary.com/demo/image/upload/w_400,h_300,c_pad/${mockPublicId}.${file.type.split('/')[1] || 'jpg'}`;
  console.log(`[UPLOAD_PLACEHOLDER] Mock upload complete for ${file.name}: ${mockUrl}`);
  return { url: mockUrl, public_id: mockPublicId, width: 400, height: 300 }; // Example dimensions
}
// --- End Placeholder ---

/**
 * ✅ POST: Create a new event
 * 
 * This dedicated endpoint handles event creation with proper validation,
 * data transformation, and error handling.
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 Authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized: You must be logged in to create an event',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    const userId = session.user.id; // Get userId for convenience

    // ✅ Sanitize and validate arrays
    const sanitizeArray = (arr: any, defaultValue: any[] = []) => {
      return Array.isArray(arr) ? arr.filter(Boolean) : defaultValue;
    };

    // ✅ Sanitize strings
    const sanitizeString = (str: any, defaultValue: string = '') => {
      return typeof str === 'string' ? str.trim() : defaultValue;
    };

    // ✅ Sanitize numbers
    const sanitizeNumber = (num: any, defaultValue: number = 0, min: number = 0, max: number | null = null) => {
      // Handle edge cases like lone minus sign
      if (typeof num === 'string') {
        const trimmed = num.trim();
        if (trimmed === '-' || trimmed === '+') {
          console.warn('Invalid number format (lone sign):', trimmed);
          return defaultValue;
        }
      }
      
      // Handle null or undefined
      if (num === null || num === undefined) {
        return defaultValue;
      }
      
      const parsedNum = typeof num === 'number' ? num : parseFloat(String(num).trim() || String(defaultValue));
      if (isNaN(parsedNum)) {
        console.warn('Invalid number format (NaN):', num);
        return defaultValue;
      }
      
      let result = Math.max(parsedNum, min);
      if (max !== null) result = Math.min(result, max);
      
      return result;
    };

    // ✅ Sanitize booleans
    const sanitizeBoolean = (bool: any, defaultValue: boolean = false) => {
      return typeof bool === 'boolean' ? bool : bool === 'true' ? true : bool === 'false' ? false : defaultValue;
    };

    // --- Subscription Limit Check ---
    try {
        const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
    
        if (currentSubscription) { // User has a currently active (non-expired) subscription
          const plan = await subscriptionService.getPlan(currentSubscription.planId); // Use the planId from the active subscription
          if (plan && plan.limits && plan.limits.maxEvents !== undefined && 
              plan.limits.maxEvents !== -1 && plan.limits.maxEvents !== Infinity) { 
            const eventCount = await eventService.countEventsByOrganizer(userId);
            if (eventCount >= plan.limits.maxEvents) {
              return NextResponse.json({
                error: `You have reached the maximum limit of ${plan.limits.maxEvents} events for your current plan (${plan.name}). Please upgrade your plan to create more events.`,
                code: 'EVENT_LIMIT_REACHED',
                planName: plan.name
              }, { status: 403 });
            }
          }
          // If plan allows infinite events or limit not reached, proceed to create event
        } else { 
          // User has NO active subscription (could be new, or existing one is expired/cancelled)
          // Implement default free allowance logic
          const DEFAULT_FREE_TIER_EVENT_LIMIT = 2; // Define the limit for the default free tier
                
          const eventCount = await eventService.countEventsByOrganizer(userId);
          if (eventCount >= DEFAULT_FREE_TIER_EVENT_LIMIT) {
            // Check if they previously had a trial that expired.
            const history = await subscriptionService.getSubscriptionHistory(userId);
            const hadTrial = history.some(sub => sub.planId === 'trial');

            if (hadTrial) {
                return NextResponse.json({
                    error: `Your trial plan has expired, and you have reached the default limit of ${DEFAULT_FREE_TIER_EVENT_LIMIT} events. Please subscribe to a new plan to create more events.`,
                    code: 'EXPIRED_TRIAL_LIMIT_REACHED'
                }, { status: 403 });
            } else {
                return NextResponse.json({ 
                    error: `You have reached the maximum limit of ${DEFAULT_FREE_TIER_EVENT_LIMIT} events for new organizers. Please subscribe to a plan to create more events.`,
                    code: 'NEW_USER_LIMIT_REACHED'
                }, { status: 403 });
            }
          }
          // If limit not reached, allow creation under the default free tier.
        }
    } catch (error) {
        console.error("Error checking subscription limits:", error);
        // Allow event creation to proceed if there's an error in subscription checking
        // This is a fail-open approach - alternatively, you could fail-closed by returning an error
        console.warn("Allowing event creation despite subscription check error");
    }
    // --- End Subscription Limit Check ---

    // Parse request body with better error handling
    let body;
    try {
      // Check content type to handle both JSON and FormData
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('multipart/form-data')) {
        // Handle FormData submission
        const formData = await request.formData();
        body = Object.fromEntries(
          Array.from(formData.entries()).map(([key, value]) => {
            // Try to parse JSON strings for arrays and objects
            if (typeof value === 'string') {
              try {
                // Check if the string looks like JSON
                if ((value.startsWith('{') && value.endsWith('}')) || 
                    (value.startsWith('[') && value.endsWith(']'))) {
                  return [key, JSON.parse(value)];
                }
                // Handle boolean values
                if (value === 'true') return [key, true];
                if (value === 'false') return [key, false];
              } catch (e) {
                // If parsing fails, just use the string value
                console.log(`Failed to parse JSON for key ${key}:`, e);
              }
            }
            return [key, value];
          })
        );
      } else {
        // Get the raw body for debugging purposes if JSON parsing fails
        const rawBody = await request.text();
        
        try {
          body = JSON.parse(rawBody);
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError.message);
          console.error("Raw request body:", rawBody.substring(0, 200) + (rawBody.length > 200 ? '...' : ''));
          
          return NextResponse.json({ 
            error: `Invalid JSON format: ${parseError.message}`,
            code: 'INVALID_JSON',
            details: 'Please ensure your request contains valid JSON data'
          }, { status: 400 });
        }
      }
    } catch (bodyReadError) {
      console.error("Error reading request body:", bodyReadError);
      return NextResponse.json({ 
        error: 'Could not read request body',
        code: 'BODY_READ_ERROR'
      }, { status: 400 });
    }

    // ✅ Validate Required Fields
    const requiredFields = ["title", "description", "date", "category"];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        code: 'MISSING_FIELDS',
        fields: missingFields
      }, { status: 400 });
    }

    // ✅ Validate Organizer ID (use session user ID)
    const organizerId = session.user.id; // Always use the session user's ID

    // ✅ Validate & Convert Dates and Time
    const startTime = body.startTime; // Get startTime from body
    if (!startTime || !/^[0-2]\d:[0-5]\d$/.test(startTime)) { // Basic HH:MM format validation
       return NextResponse.json({ 
         error: "Invalid or missing start time format (HH:MM required)", 
         code: 'INVALID_TIME_FORMAT',
         field: 'startTime'
       }, { status: 400 });
    }
    
    // Combine date and time. Consider sending ISO 8601 from client for robustness.
    const eventDateTimeString = `${body.date}T${startTime}`; 
    const eventDate = new Date(eventDateTimeString); 

    if (isNaN(eventDate.getTime())) {
      return NextResponse.json({ 
        error: "Invalid combined date/time format from date and startTime", 
        code: 'INVALID_DATETIME_FORMAT',
        field: 'date/startTime' // Indicate both fields contribute
      }, { status: 400 });
    }

    // Validate event date and time is in the future
    // Use '<=' to prevent starting exactly 'now' or in the immediate past second due to processing time
    if (eventDate <= new Date()) { 
      return NextResponse.json({
        error: "Event start date and time must be in the future",
        code: 'PAST_DATETIME', // Updated code
        field: 'startTime' // Field causing the issue
      }, { status: 400 });
    }

    // ✅ Validate end date if provided
    let endDate = undefined;
    if (body.endDate) {
      endDate = new Date(body.endDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ 
          error: "Invalid end date format", 
          code: 'INVALID_DATE_FORMAT',
          field: 'endDate'
        }, { status: 400 });
      }
      
      // End date must be after start date
      if (endDate <= eventDate) {
        return NextResponse.json({ 
          error: "End date must be after start date", 
          code: 'INVALID_DATE_RANGE',
          field: 'endDate'
        }, { status: 400 });
      }
    }

    // ✅ Validate registration deadline if provided
    let registrationDeadline = undefined;
    if (body.registrationDeadline) {
      registrationDeadline = new Date(body.registrationDeadline);
      if (isNaN(registrationDeadline.getTime())) {
        return NextResponse.json({ 
          error: "Invalid registration deadline format", 
          code: 'INVALID_DATE_FORMAT',
          field: 'registrationDeadline'
        }, { status: 400 });
      }
      
      // Registration deadline must be before event date
      if (registrationDeadline >= eventDate) {
        return NextResponse.json({ 
          error: "Registration deadline must be before event date", 
          code: 'INVALID_DATE_RANGE',
          field: 'registrationDeadline'
        }, { status: 400 });
      }
    }

    // ✅ Validate early bird deadline if provided
    let earlyBirdDeadline = undefined;
    if (body.earlyBirdDeadline) {
      earlyBirdDeadline = new Date(body.earlyBirdDeadline);
      if (isNaN(earlyBirdDeadline.getTime())) {
        return NextResponse.json({ 
          error: "Invalid early bird deadline format", 
          code: 'INVALID_DATE_FORMAT',
          field: 'earlyBirdDeadline'
        }, { status: 400 });
      }
      
      // Early bird deadline must be before registration deadline if that exists
      if (registrationDeadline && earlyBirdDeadline >= registrationDeadline) {
        return NextResponse.json({ 
          error: "Early bird deadline must be before registration deadline", 
          code: 'INVALID_DATE_RANGE',
          field: 'earlyBirdDeadline'
        }, { status: 400 });
      }
      
      // Otherwise must be before event date
      if (earlyBirdDeadline >= eventDate) {
        return NextResponse.json({ 
          error: "Early bird deadline must be before event date", 
          code: 'INVALID_DATE_RANGE',
          field: 'earlyBirdDeadline'
        }, { status: 400 });
      }
    }
    
    // ✅ Validate Category
    const allowedCategories = ['tech', 'business', 'arts', 'sports', 'health', 'education', 'social', 'other'];
    if (!allowedCategories.includes(body.category)) {
      return NextResponse.json({ 
        error: `Invalid category. Must be one of: ${allowedCategories.join(', ')}`, 
        code: 'INVALID_CATEGORY',
        field: 'category'
      }, { status: 400 });
    }

    // ✅ Validate Price
    const price = typeof body.price === 'number' ? body.price : parseFloat(body.price?.toString() || "0");
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ 
        error: "Price must be a non-negative number", 
        code: 'INVALID_PRICE',
        field: 'price'
      }, { status: 400 });
    }

    let meetingLinkFromClient = body.meetingLink as string | undefined;
    const roomNameFromClient = body.roomName as string | undefined;

    // --- Jitsi Meeting Link and RoomName Handling ---
    if (sanitizeBoolean(body.isVirtual) && body.streamingPlatform === 'JITSI') {
      const appId = process.env.NEXT_PUBLIC_JAAS_APP_ID;
      if (!appId) {
        console.error("[Event Create] Missing NEXT_PUBLIC_JAAS_APP_ID for JaaS. Cannot generate meeting link if not provided by client.");
        // If roomName is also missing from client for JITSI, this is a problem.
        if (!roomNameFromClient) {
          return NextResponse.json({ 
            error: "Server configuration error: Missing JaaS App ID, and room name not provided by client for Jitsi event.", 
            code: 'JAAS_CONFIG_ERROR_NO_ROOMNAME'
          }, { status: 500 });
        }
        // If meetingLink is not provided by client, but roomName is, we can't generate link without appId.
        // However, LocationForm should ideally send the meetingLink.
        // If meetingLinkFromClient is not set, it will remain undefined, and only roomNameFromClient will be saved.
      }

      if (!roomNameFromClient) {
        // This case should ideally not happen if LocationForm.tsx works as expected for Jitsi events.
        // LocationForm.tsx should always try to set a roomName (even a temporary one for new events).
        console.warn("[Event Create] Jitsi event created without a roomName from the client. This is unexpected.");
        // Depending on policy, you might want to return an error here or allow creation without a roomName.
        // For now, we'll allow it, but it's a sign of a potential client-side issue.
      }

      // If meetingLink is not provided by the client, but roomName is, and we have an appId, generate the meetingLink.
      if (!meetingLinkFromClient && roomNameFromClient && appId) {
        meetingLinkFromClient = createJaaSMeetingUrl(appId, roomNameFromClient);
        console.log(`[Event Create] Generated JaaS meetingLink: ${meetingLinkFromClient} from client roomName: ${roomNameFromClient}`);
      }
      // If meetingLinkFromClient is still undefined here (e.g. no appId or client didn't send roomName), 
      // it will be saved as undefined. The client (LocationForm) is the primary source for these.
    } else if (sanitizeBoolean(body.isVirtual) && meetingLinkFromClient) {
      // For other virtual platforms, just use the meetingLink provided by the client.
      // roomNameFromClient might or might not be relevant depending on the platform.
    } else if (sanitizeBoolean(body.isVirtual)) {
      // Virtual event but no meeting link provided and not Jitsi (or Jitsi without roomName/appId)
      meetingLinkFromClient = undefined; // Ensure it's undefined if not applicable or couldn't be generated.
    }
    // --- End of Jitsi Meeting Link and RoomName Handling ---

    // --- Image Upload Handling ---
    let finalCoverImageUrl: string | undefined;
    let coverImagePublicId: string | undefined;
    let coverImageWidth: number | undefined;
    let coverImageHeight: number | undefined;
    let coverImageAttribution: any | undefined;

    // Prioritize coverImageDetails from client (contains URL from client-side Cloudinary upload)
    if (body.coverImageDetails && body.coverImageDetails.url) {
        console.log("[Event Create] Using coverImageDetails from client:", body.coverImageDetails);
        finalCoverImageUrl = body.coverImageDetails.url;
        coverImagePublicId = body.coverImageDetails.publicId;
        coverImageWidth = body.coverImageDetails.width;
        coverImageHeight = body.coverImageDetails.height;
        coverImageAttribution = body.coverImageDetails.attribution;
    } 
    // If no details, try to upload coverImageFile if it exists
    else if (body.coverImageFile instanceof File) {
        console.log("[Event Create] No coverImageDetails, attempting upload of coverImageFile...");
        const uploadedImage = await uploadToCloudinary(body.coverImageFile, "event_covers");
        if (uploadedImage) {
            finalCoverImageUrl = uploadedImage.url; 
            coverImagePublicId = uploadedImage.publicId;
            // Note: width/height might not be returned by your current uploadToCloudinary helper
            // You might need to enhance it or omit width/height if not critical here.
            console.log("[Event Create] coverImageFile uploaded to Cloudinary:", finalCoverImageUrl);
        } else {
            console.warn("[Event Create] Cover image file upload failed.");
            // Default will be handled below if finalCoverImageUrl is still undefined
        }
    } 
    // Legacy: if body.coverImage is a string URL (e.g., manually entered Unsplash link)
    // This should be less common with the new frontend flow.
    else if (typeof body.coverImage === 'string' && body.coverImage.trim()) {
        console.log("[Event Create] Cover image is a string URL (legacy or manual entry):", body.coverImage);
        finalCoverImageUrl = body.coverImage.trim();
    }

    // Fallback to default if no image determined yet
    if (!finalCoverImageUrl) {
        console.log("[Event Create] No cover image determined, falling back to category default.");
        const defaultImages: Record<string, string> = {
            tech: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80",
            business: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80",
            arts: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80",
            sports: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80",
            health: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80",
            education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80",
            social: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80",
            other: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80"
        };
        finalCoverImageUrl = defaultImages[body.category as string] || defaultImages.other;
        // For defaults, other fields like publicId, width, height, attribution would be undefined
        coverImagePublicId = undefined;
        coverImageWidth = undefined;
        coverImageHeight = undefined;
        coverImageAttribution = undefined;
    }
    
    // For speaker photos, you'll iterate through body.speakers and upload each photo if it's a File.

    // ✅ Process Speakers (including avatar uploads) before constructing eventInput
    const parsedSpeakersArray = sanitizeArray(body.speakers); // This is the JSON part

    const processedSpeakers = await Promise.all(
      parsedSpeakersArray.map(async (speaker: any, index: number) => {
        let finalAvatarObject: Partial<ImageObject> | undefined = undefined;
        
        // Check for a separately uploaded file for this speaker
        const speakerFile = body[`speakerPhotoFile[${index}]`];

        if (speakerFile && speakerFile instanceof File) {
          console.log(`[Event Create] Found uploaded avatar File for speaker ${speaker.name || `at index ${index}`}. Uploading...`);
          const uploadResult = await uploadToCloudinary(speakerFile, 'speaker_avatars');
          if (uploadResult) {
            console.log(`[Event Create] Successfully uploaded avatar for speaker ${speaker.name}: ${uploadResult.url}`);
            finalAvatarObject = {
              url: uploadResult.url,
              publicId: uploadResult.publicId,
              // Assuming 'uploadToCloudinary' doesn't provide width/height directly, 
              // or we don't need it from a fresh upload as much as for pre-set ones.
              // If it does, you can add:
              // width: uploadResult.width, 
              // height: uploadResult.height,
            };
          } else {
            console.error(`[Event Create] Failed to upload avatar for speaker ${speaker.name}.`);
            // Optionally, use a default or skip avatar if upload fails
          }
        } else {
          // If no new file, check for existing avatar/photo data in the JSON
          const existingAvatarData = speaker.avatar || speaker.photo;
          if (existingAvatarData && typeof existingAvatarData === 'object' && existingAvatarData.url) {
            console.log(`[Event Create] Using pre-existing avatar URL for speaker ${speaker.name}: ${existingAvatarData.url}`);
            finalAvatarObject = {
              url: sanitizeString(existingAvatarData.url),
              publicId: sanitizeString(existingAvatarData.publicId, undefined),
              width: sanitizeNumber(existingAvatarData.width, undefined),
              height: sanitizeNumber(existingAvatarData.height, undefined),
              attribution: existingAvatarData.attribution ? {
                photographer: sanitizeString(existingAvatarData.attribution.name, undefined),
                link: sanitizeString(existingAvatarData.attribution.link, undefined),
              } : undefined,
            };
          } else {
            console.log(`[Event Create] No new avatar file and no pre-existing URL for speaker ${speaker.name}.`);
          }
        }

        return {
          name: sanitizeString(speaker.name),
          title: sanitizeString(speaker.title, undefined),
          bio: sanitizeString(speaker.bio, undefined),
          avatar: finalAvatarObject, // This will be the ImageObject or undefined
          socialLinks: sanitizeArray(speaker.socialLinks).map((link: any) => ({
            platform: sanitizeString(link.platform),
            url: sanitizeString(link.url)
          })),
        };
      })
    );

    // ✅ Construct Event Input
    
    // Determine visibility status and restrictedTo list
    const visibilityStatus = (body.visibility?.status || "public") as ('public' | 'private');
    const restrictedToArray = sanitizeArray(body.visibility?.restrictedTo, []);
    
    // Construct the visibility object based on the status
    let visibilityInput: EventVisibilityType;
    if (visibilityStatus === 'private') {
        // Private requires restrictedTo to be an array (enforced by sanitizeArray)
        visibilityInput = {
            status: 'private',
            restrictedTo: restrictedToArray
        };
    } else {
        // Public can optionally have restrictedTo
        visibilityInput = {
            status: 'public',
            restrictedTo: restrictedToArray.length > 0 ? restrictedToArray : undefined
        };
    }

    // Construct the coverImage object for the database
    const coverImageForDb = finalCoverImageUrl ? {
        url: finalCoverImageUrl,
        publicId: coverImagePublicId,
        width: coverImageWidth,
        height: coverImageHeight,
        attribution: coverImageAttribution
    } : undefined; // Or a default object if your schema requires one for coverImage

    const eventInput: CreateEventInput = {
      title: sanitizeString(body.title),
      description: sanitizeString(body.description),
      shortDescription: sanitizeString(body.shortDescription, undefined),
      category: body.category as EventCategory,
      status: (body.status || "upcoming") as EventStatus,
      visibility: visibilityInput, // Assign the correctly typed object
      date: eventDate.toISOString(),
      endDate: endDate ? endDate.toISOString() : undefined,
      duration: sanitizeNumber(body.duration, 120, 5, 1440), // between 5 minutes and 24 hours
      isVirtual: sanitizeBoolean(body.isVirtual),
      meetingLink: meetingLinkFromClient, // Use the processed meetingLink
      streamingPlatform: body.streamingPlatform as StreamingPlatform,
      roomName: roomNameFromClient, // Use the client-provided roomName
      location: sanitizeBoolean(body.isVirtual) ? undefined : {
        address: sanitizeString(body.location?.address ?? ""),
        city: sanitizeString(body.location?.city, undefined),
        country: sanitizeString(body.location?.country, undefined),
        coordinates: body.location?.coordinates
      },
      coverImage: coverImageForDb, // New way, assigning the coverImage object
      tags: sanitizeArray(body.tags),
      requirements: sanitizeArray(body.requirements),
      targetAudience: sanitizeArray(body.targetAudience),
      skillLevel: (body.skillLevel ?? "all-levels") as EventSkillLevel,
      price: sanitizeNumber(body.price, 0, 0),
      currency: sanitizeString(body.currency, "USD"),
      maxAttendees: sanitizeNumber(body.maxAttendees, 100, 1, 10000),
      minimumAttendees: sanitizeNumber(body.minimumAttendees, 0, 0),
      registrationDeadline: registrationDeadline ? registrationDeadline.toISOString() : undefined,
      earlyBirdDeadline: earlyBirdDeadline ? earlyBirdDeadline.toISOString() : undefined,
      refundPolicy: sanitizeString(body.refundPolicy, undefined),
      organizerId, // This will now correctly be session.user.id
      organizer: {
        id: organizerId, // This will also be session.user.id
        name: sanitizeString(body.organizer?.name || session.user.name, "Event Organizer"),
        email: sanitizeString(body.organizer?.email || session.user.email, "organizer@example.com"),
        avatar: sanitizeString(body.organizer?.avatar || session.user.image, "https://api.dicebear.com/7.x/avataaars/svg?seed=demo"),
        company: sanitizeString(body.organizer?.company, undefined)
      },
      agenda: sanitizeArray(body.agenda),
      speakers: processedSpeakers, // Use the processed speakers array
      sponsors: sanitizeArray(body.sponsors).map(sponsor => ({ // Added sponsor sanitization
        name: sanitizeString(sponsor.name, 'Sponsor Name'),
        logo: sanitizeString(sponsor.logo, undefined),
        website: sanitizeString(sponsor.website, undefined),
        level: sanitizeString(sponsor.level, 'standard')
      })),
      faq: sanitizeArray(body.faq).map(item => ({ // Added faq sanitization
        question: sanitizeString(item.question),
        answer: sanitizeString(item.answer)
      })),
      additionalDetails: body.additionalDetails || {}, // Added additionalDetails
      contactEmail: sanitizeString(body.contactEmail, session.user.email || undefined), // Added contactEmail
      contactPhone: sanitizeString(body.contactPhone, undefined), // Added contactPhone
      venueDetails: sanitizeString(body.venueDetails, undefined), // Added venueDetails
      notesForAttendees: sanitizeString(body.notesForAttendees, undefined), // Added notesForAttendees
      createdAt: new Date().toISOString(), // Add createdAt timestamp
      updatedAt: new Date().toISOString(), // Add updatedAt timestamp
      metadata: body.metadata || {},
    };

    // Log the processed speakers before saving to DB
    console.log("[Event Create] Processed speakers being sent to database:", JSON.stringify(eventInput.speakers, null, 2));

    // Connect to database before creating the event
    await connectDB();

    // ✅ Create Event using Service (initial creation)
    const event = await eventService.createEvent(eventInput);
    
    // --- Post-creation Jitsi Update ---
    // If the event is virtual, Jitsi, and we have an appId, regenerate roomName & meetingLink with the new event._id
    const appId = process.env.NEXT_PUBLIC_JAAS_APP_ID;
    if (event.isVirtual && event.streamingPlatform === 'JITSI' && appId && event._id) {
      console.log(`[Event Create POST-HOOK] Jitsi event created with ID: ${event._id}. Regenerating roomName/meetingLink.`);
      const persistentRoomName = generateJitsiRoomName(event._id.toString(), Date.now());
      const persistentMeetingLink = createJaaSMeetingUrl(appId, persistentRoomName);

      // Prepare update data
      const updateData = {
        roomName: persistentRoomName,
        meetingLink: persistentMeetingLink,
        updatedAt: new Date().toISOString() // Also update the updatedAt timestamp
      };

      const updateSuccessful = await eventService.updateEvent(event._id.toString(), updateData);
      if (updateSuccessful) {
        // Manually merge the updates into the event object for the response
        event.roomName = persistentRoomName;
        event.meetingLink = persistentMeetingLink;
        event.updatedAt = updateData.updatedAt; // event.updatedAt is already an ISO string from createEvent or this update
        console.log(`[Event Create POST-HOOK] Event ${event._id} updated with persistent Jitsi details: room='${persistentRoomName}'`);
      } else {
        console.warn(`[Event Create POST-HOOK] Failed to update event ${event._id} with persistent Jitsi details (update unsuccessful). Original event data will be returned.`);
        // Decide on error handling: return original event or throw an error?
        // For now, we'll log a warning and return the event as it was after initial creation.
      }
    }
    // --- End Post-creation Jitsi Update ---

    return NextResponse.json(
      {
        message: "Event created successfully",
        event,
        links: {
          self: `/api/events/${event._id}`,
          register: `/api/events/${event._id}/register`,
          tickets: `/api/events/${event._id}/tickets`,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create event', 
        details: (error as Error).message,
        code: 'SERVER_ERROR',
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
} 