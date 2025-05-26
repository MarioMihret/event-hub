import { z } from 'zod';

// Helper for refining date/time logic
const refineEventTimes = (data: { eventDate: string, startTime: string, endTime: string }, ctx: z.RefinementCtx) => {
    // Only proceed if all fields are valid strings initially
    if (!data.eventDate || !data.startTime || !data.endTime) {
        return; // Let individual required checks handle this
    }
    
    // Basic time format check (HH:MM) - Zod doesn't have a built-in time type
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(data.startTime)) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['startTime'],
            message: 'Invalid time format (HH:MM required)',
        });
        return; // Stop refinement if start time is invalid format
    }
     if (!timeRegex.test(data.endTime)) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['endTime'],
            message: 'Invalid time format (HH:MM required)',
        });
        return; // Stop refinement if end time is invalid format
    }

    try {
        const now = new Date();
        const startDateTime = new Date(`${data.eventDate}T${data.startTime}`);
        const endDateTime = new Date(`${data.eventDate}T${data.endTime}`);

        // Check if start time is in the future
        if (startDateTime <= now) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['startTime'],
                message: 'Event start time must be in the future',
            });
        }

        // Check if end time is after start time
        if (endDateTime <= startDateTime) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['endTime'],
                message: 'End time must be after start time',
            });
        }
    } catch (e) {
        // Handle potential invalid date/time combinations during Date creation
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['eventDate'], // Add issue to date as it's the context
            message: 'Invalid date or time value provided',
        });
    }
};

// Zod schema for EventLocation (nested)
const eventLocationSchema = z.object({
  address: z.string().trim().min(1, "Address cannot be empty if provided.").optional().or(z.literal('')),
  city: z.string().trim().min(1, "City cannot be empty if provided.").optional().or(z.literal('')),
  country: z.string().trim().optional().or(z.literal('')),
  postalCode: z.string().trim().optional().or(z.literal('')),
}).partial(); // Makes all fields optional, good for a form where not all are filled initially

// Helper for conditional location/link validation
const refineLocationOrLink = (data: { isVirtual: boolean, location?: Partial<z.infer<typeof eventLocationSchema>>, meetingLink?: string, streamingPlatform?: string }, ctx: z.RefinementCtx) => {
    if (data.isVirtual) {
        // If virtual, meetingLink is required and must be a valid URL.
        if (!data.meetingLink) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['meetingLink'],
                message: 'Meeting link is required for virtual events.',
            });
        } else if (!z.string().url().safeParse(data.meetingLink).success) {
             // Check if the provided link is a valid URL format.
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['meetingLink'],
                message: 'Meeting link must be a valid URL (e.g., https://...)',
            });
        }
    } else {
        // If not virtual, location object itself is required, and at least address or city should be somewhat filled.
        if (!data.location || (!data.location.address?.trim() && !data.location.city?.trim())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['location'], // General error on the location object
                message: 'Address or City is required for physical events.',
            });
        } else {
            // Optional: Add more specific length checks if address or city are provided
            if (data.location.address && data.location.address.trim().length > 0 && data.location.address.trim().length < 3) {
                 ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['location', 'address'],
                    message: 'Address must be at least 3 characters if provided.',
                });
            }
            if (data.location.city && data.location.city.trim().length > 0 && data.location.city.trim().length < 3) {
                 ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['location', 'city'],
                    message: 'City must be at least 3 characters if provided.',
                });
            }
        }
    }
};

// Helper for conditional price validation
const refinePrice = (data: { isFreeEvent: boolean, price: number | undefined }, ctx: z.RefinementCtx) => {
    console.log(`[refinePrice] Running check. isFreeEvent: ${data.isFreeEvent}, price: ${data.price}`);
    if (!data.isFreeEvent) {
        console.log(`[refinePrice] Paid event. Checking price...`);
        if (data.price === undefined || data.price === null || data.price < 0) {
            console.log(`[refinePrice] Price is undefined, null, or negative. Adding issue.`);
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['price'],
                message: 'Price is required for paid events and must be non-negative',
            });
        }
        // Check 2: Price must be >= 0.01 if paid
        else if (data.price < 0.01) { // Check if price is 0
             console.log(`[refinePrice] Price is ${data.price}, which is less than 0.01. Adding issue.`);
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['price'],
                message: 'Minimum price for paid events is 0.01',
            });
        }
        // Check 3: Max price (only if price is valid so far)
        if (typeof data.price === 'number' && data.price > 100000) {
             console.log(`[refinePrice] Price ${data.price} exceeds max. Adding issue.`);
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['price'],
                message: 'Price seems too high (max $100,000)',
            });
         }
    }
};

// Zod schema for individual speaker
const speakerSchema = z.object({
    id: z.string(), // Assuming ID is managed elsewhere
    name: z.string().min(2, { message: "Speaker name must be at least 2 characters" }).max(100),
    bio: z.string().max(500, { message: "Bio must be less than 500 characters" }).optional(),
    photo: z.object({
        url: z.string().url({ message: "Invalid image URL" }),
        publicId: z.string()
    })
});

// Zod schema for image objects
const imageSchema = z.object({
    url: z.string().url({ message: "Invalid image URL" }),
    publicId: z.string() // Identifier for backend/CDN
});

// Main Event Form Schema
export const eventFormSchema = z.object({
    // Basic Info
    title: z.string()
             .min(3, { message: "Title must be at least 3 characters" })
             .max(100, { message: "Title must be less than 100 characters" })
             .trim(),
    category: z.string().min(1, { message: "Category is required" }),
    eventDate: z.string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format (YYYY-MM-DD required)" })
                .refine(dateStr => {
                    try {
                        // Parse YYYY-MM-DD string manually to avoid UTC interpretation
                        const [year, month, day] = dateStr.split('-').map(Number);
                        // Note: month is 0-indexed in Date constructor (0 = January)
                        const inputDate = new Date(year, month - 1, day);

                        // Check if the constructed date is valid
                        if (isNaN(inputDate.getTime())) return false;
                        // Also check if the components match to catch invalid dates like 2024-02-31
                         if (inputDate.getFullYear() !== year || 
                            inputDate.getMonth() !== month - 1 || 
                            inputDate.getDate() !== day) {
                            return false; 
                         }

                        // Get today's date (local time) and reset time part
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        // Input date already has time set to 00:00:00 in local timezone by constructor
                        
                        // Compare the local date part of inputDate with today's local date part
                        return inputDate >= today;
                    } catch (e) {
                         console.error("Error parsing event date:", e); // Log error for debugging
                        return false; // Error during parsing
                    }
                }, { message: "Event date must be today or in the future" }),
    startTime: z.string().min(1, { message: "Start time is required" }), // Format validated in refine
    endTime: z.string().min(1, { message: "End time is required" }), // Format validated in refine

    // Details
    description: z.string()
                  .min(10, { message: "Description must be at least 10 characters" })
                  .trim(),
    shortDescription: z.string()
                       .max(150, { message: "Short description must be less than 150 characters" })
                       .trim()
                       .optional(), // Making optional, adjust if required
    tags: z.array(z.string()).optional(),
    requirements: z.array(z.string()).optional(),
    targetAudience: z.array(z.string()).optional(),
    
    // Location / Virtual
    isVirtual: z.boolean(),
    location: eventLocationSchema.optional(), // Use the new object schema
    meetingLink: z.string().trim().optional(), // Optional again, removed min(1)
    streamingPlatform: z.string().optional(),

    // Tickets & Pricing
    duration: z.number().int().positive({ message: "Duration must be a positive number" }).optional(), // Assuming minutes
    maxAttendees: z.number().int().positive({ message: "Max attendees must be a positive number" }).optional(),
    minimumAttendees: z.number().int().min(0, { message: "Minimum attendees cannot be negative" }).optional(), // Allow 0
    isFreeEvent: z.boolean(),
    price: z.number().optional(), // Required conditionally via refine
    currency: z.string().length(3, { message: "Currency code must be 3 letters" }).optional(), // Defaulted elsewhere?
    refundPolicy: z.string().max(500, { message: "Refund policy too long (max 500 chars)" }).optional(),
    earlyBirdDeadline: z.string().optional().refine(dateStr => !dateStr || /^\d{4}-\d{2}-\d{2}$/.test(dateStr), {
        message: "Invalid date format (YYYY-MM-DD required)",
    }), // Optional date

    // Images & Speakers
    coverImage: imageSchema,
    logo: imageSchema.optional(),
    speakers: z.array(speakerSchema).min(1, { message: "At least one speaker is required" }),

    // Visibility - Aligned with EventVisibilityObject
    visibility: z.object({
      status: z.enum(['public', 'private'], { // 'scheduled' removed
        required_error: "Visibility status is required",
        invalid_type_error: "Invalid visibility status (must be public or private)"
      }),
      restrictedTo: z.array(z.string().email({ message: "Invalid email format in restricted list." })).optional(),
    }).superRefine((data, ctx) => {
      // Refinement logic for 'scheduled' status has been removed.
      if (data.status === 'private') {
        if (!data.restrictedTo || data.restrictedTo.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['restrictedTo'],
            message: 'At least one user must be specified for private visibility.',
          });
        }
      }
    }).default({ status: 'public' }), // Default to public visibility object

    roomName: z.string().min(3).optional(), // Added for Jitsi virtual events

}).superRefine(refineEventTimes)
  .superRefine(refinePrice)
  .superRefine(refineLocationOrLink);


// Infer the type for use in components
export type EventFormData = z.infer<typeof eventFormSchema>;

// Example function to format Zod errors for the form state
export const formatZodErrors = (error: z.ZodError | null): Record<string, string> => {
    if (!error) return {};
    const formattedErrors: Record<string, string> = {};
    error.errors.forEach(err => {
        if (err.path.length > 0) {
            // Use the first path segment as the key, might need adjustment for nested errors
            const key = err.path.join('.'); // Handle nested paths like speakers.0.name
            if (!formattedErrors[key]) { // Only keep the first error per field
                formattedErrors[key] = err.message;
            }
        }
    });
    return formattedErrors;
}; 