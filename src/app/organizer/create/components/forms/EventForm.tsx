"use client"
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, ChevronRight, Save, CheckCircle, Edit } from 'lucide-react';
import type { Event } from '@/types/event';
import { UpdateVisibilityInput, EventVisibilityObject, EventLocation } from '@/types/event';
// import { generateJitsiLink } from '@/utils/jitsi'; // Removed
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from 'next-auth/react';

// Import our types and hooks
import { EventFormProps, FormState, VisibilityStatus, StreamingPlatformType, FormStep } from '../../types';
// Import the schema type and hook
import { eventFormSchema, EventFormData } from '@/lib/validations/eventSchema';
import useFormValidation, { FullValidationData } from '../../hooks/useFormValidation';
import { useVisibilitySettings } from '../../hooks/useVisibilitySettings';

// Import our components
import FormSteps from './FormSteps';
import BasicInfoForm from './BasicInfoForm';
import DetailsForm from './DetailsForm';
import LocationForm from './LocationForm';
import TicketsForm from './TicketsForm';
import ImagesForm from './ImagesForm';
import SpeakerPhotosForm from './SpeakerPhotosForm';
import ReviewStep from './ReviewStep';

// Use the dynamic import correctly
const JitsiMeeting = dynamic(
  () => import('@/components/JitsiMeeting').then(mod => mod.default).catch(err => {
    console.error('Error loading JitsiMeeting component:', err);
    return () => (
      <div className="p-4 text-red-500 bg-red-100 rounded-md">
        Failed to load meeting component. Please refresh the page.
      </div>
    );
  }),
  { ssr: false }
);

// Helper debounce function
const debounce = <F extends (...args: any[]) => any>(func: F, wait: number) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<F>): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

const AUTOSAVE_INTERVAL = 5000; // Check every 5 seconds for changes to autosave
const AUTOSAVE_DEBOUNCE = 2000; // Wait 2 seconds after changes stop before saving

// Helper function to create the full data object for validation
const createValidationData = (
  event: FormState,
  eventTitle: string,
  isVirtual: boolean,
  meetingLink: string,
  streamingPlatform: StreamingPlatformType,
  tags: string[],
  requirements: string[],
  targetAudience: string[],
  visibility: 'public' | 'private',
  restrictedTo: string[],
  roomName: string | null,
  createVisibilityObject: () => EventVisibilityObject
): FullValidationData => {
  // Ensure numeric fields that might be empty strings are parsed or defaulted
  const parseOptionalNumber = (val: number | string | undefined): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  };

  const parseRequiredNumber = (val: number | string | undefined, defaultValue: number): number => {
    const num = parseOptionalNumber(val);
    return num === undefined ? defaultValue : num;
  }

  return {
    // Basic Info
    title: eventTitle,
    category: event.category || '',
    eventDate: event.eventDate || '',
    startTime: event.startTime || '',
    endTime: event.endTime || '',

    // Details
    description: event.description || '',
    shortDescription: event.shortDescription || undefined, // Match schema optional
    tags: tags, // Use argument 'tags' instead of state 'selectedTags'
    requirements: requirements, // Use state directly
    targetAudience: targetAudience, // Use state directly

    // Location / Virtual
    isVirtual: isVirtual,
    location: event.location, // Pass the location object directly
    meetingLink: meetingLink || undefined, // Revert to undefined
    streamingPlatform: streamingPlatform || undefined,

    // Tickets & Pricing - Parse numbers carefully
    duration: parseOptionalNumber(event.duration),
    maxAttendees: parseOptionalNumber(event.maxAttendees),
    minimumAttendees: parseOptionalNumber(event.minimumAttendees),
    isFreeEvent: event.isFreeEvent,
    price: parseOptionalNumber(event.price),
    currency: event.currency || 'USD', // Keep default or make optional in schema?
    refundPolicy: event.refundPolicy || undefined, // Match schema optional
    earlyBirdDeadline: event.earlyBirdDeadline || undefined, // Match schema optional

    // Images & Speakers (Assuming these are correct in FormState)
    coverImage: event.coverImage ? { url: event.coverImage.url || '', publicId: event.coverImage.publicId || '' } : undefined,
    logo: event.logo ? { url: event.logo.url || '', publicId: event.logo.publicId || '' } : undefined,
    // Map speaker photos correctly
    speakers: event.speakers?.map(s => ({
      id: s.id || '', // Ensure id is present
      name: s.name || '',
      bio: s.bio || undefined,
      photo: s.photo ? { url: s.photo.url || '', publicId: s.photo.publicId || '' } : undefined,
    })) || [],

    // Visibility
    visibility: createVisibilityObject(), // Use the passed function
    roomName: roomName === null ? undefined : roomName,
  };
};

// Define SubmitForm component HERE, before EventForm
const SubmitForm: React.FC<{
  event: FormState;
  isSubmitting: boolean;
  eventTitle: string;
  isVirtual: boolean;
  streamingPlatform: string;
  visibility: 'public' | 'private';
  restrictedTo?: string[];
  formErrors: Record<string, string>;
}> = ({
  event,
  isSubmitting,
  eventTitle,
  isVirtual,
  streamingPlatform,
  visibility,
  restrictedTo,
  formErrors
}) => {
  const hasErrors = Object.keys(formErrors).length > 0;

  const renderErrors = () => {
    if (!hasErrors) return null;
    return (
      <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
        <h4 className="font-semibold mb-2">Please review the following errors:</h4>
        <ul className="list-disc list-inside text-sm space-y-1">
          {Object.entries(formErrors).map(([key, message]) => (
            <li key={key}>
              <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {message}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">
        Review and Submit
      </h3>
      <p className="text-gray-400">
        Please review your event details below. You can go back to previous steps to make changes.
      </p>
      <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
        <h4 className="font-semibold text-lg text-purple-300">Event Summary</h4>
        <p><span className="font-medium text-gray-400">Title:</span> {eventTitle}</p>
        <p><span className="font-medium text-gray-400">Date:</span> {event.eventDate} from {event.startTime} to {event.endTime}</p>
        <p><span className="font-medium text-gray-400">Category:</span> {event.category}</p>
        <p><span className="font-medium text-gray-400">Description:</span> {event.description?.substring(0, 100)}...</p>
        {isVirtual ? (
          <p><span className="font-medium text-gray-400">Location:</span> Virtual ({streamingPlatform})</p>
        ) : (
          <p><span className="font-medium text-gray-400">Location:</span> 
            {event.location?.address || event.location?.city || 'Physical location not fully specified'}
            {event.location?.address && event.location?.city ? ', ' : ''}
            {event.location?.address && event.location?.city ? event.location.city : ''}
            {/* Add country, postalCode if desired for summary */}
          </p>
        )}
         <p><span className="font-medium text-gray-400">Price:</span> {event.isFreeEvent ? 'Free' : `$${event.price}`}</p>
      </div>
      {renderErrors()}
      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200 ease-in-out flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || hasErrors}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Submitting...
            </>
          ) : (
             hasErrors ? 'Please Fix Errors' : 'Submit Event'
          )}
        </button>
      </div>
    </div>
  );
};

// Define the steps for the form, including the new 'review' step
const steps: { id: FormStep; name: string }[] = [
  { id: 'basic', name: 'Basic Info' },
  { id: 'details', name: 'Details' },
  { id: 'location', name: 'Location' },
  { id: 'tickets', name: 'Tickets & Pricing' },
  { id: 'images', name: 'Images' },
  { id: 'speakers', name: 'Speakers' },
  { id: 'review', name: 'Review & Create' },
];

// Now define the main EventForm component
const EventForm: React.FC<Omit<EventFormProps, 'eventToEdit'>> = ({ onClose, onSubmit }) => {
  // Form navigation state - initialize with 'basic'
  const [currentStep, setCurrentStep] = useState<FormStep>('basic');
  const { data: session } = useSession();
  const userId = session?.user?.id; // Get user ID from session

  // Helper to get the dynamic localStorage key
  const getDraftStorageKey = useCallback(() => {
    if (!userId) return null;
    return `event_form_draft_${userId}`;
  }, [userId]);
  
  // Event details state
  const [eventTitle, setEventTitle] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  
  // Virtual event state
  const [meetingLink, setMeetingLink] = useState('');
  const [roomName, setRoomName] = useState<string | null>(null);
  const [streamingPlatform, setStreamingPlatform] = useState<StreamingPlatformType>('');
  const [showJitsiMeeting, setShowJitsiMeeting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false); // Tracks if there are unsaved changes
  
  // Refs for tracking changes and autosave
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const draftJustLoaded = useRef(false); // <-- Add Ref to track draft loading
  
  // Add event state for proper form handling
  const [event, setEvent] = useState<FormState>({
    description: '',
    shortDescription: '',
    location: {}, 
    eventDate: '',
    startTime: '',
    endTime: '',
    category: '',
    duration: 60, 
    maxAttendees: 100, 
    minimumAttendees: 1, 
    price: 0,
    isFreeEvent: true, 
    currency: 'USD',
    refundPolicy: '',
    earlyBirdDeadline: '',
    coverImage: undefined,
    logo: undefined,
    speakers: []
  });

  // Use our custom hooks
  const {
    formErrors,
    setFormErrors,
    validateForm,
    clearErrors,
    validateFieldWithDebounce,
    validateField,
    fieldsTouched,
    markFieldAsTouched,
    resetTouchedState
  } = useFormValidation();
  
  const {
    visibility,
    setVisibility,
    restrictedTo,
    setRestrictedTo,
    addRestrictedUser,
    removeRestrictedUser,
    createVisibilityObject
  } = useVisibilitySettings();

  // --- Prepare Full Validation Data ---
  const getFullValidationData = useCallback((): FullValidationData => {
    const finalMeetingLink = meetingLink;
    return createValidationData(
      event,
      eventTitle,
      isVirtual,
      finalMeetingLink,
      streamingPlatform,
      selectedTags,
      requirements,
      targetAudience,
      visibility,
      restrictedTo,
      roomName,
      createVisibilityObject
    );
  }, [
    event, eventTitle, isVirtual, meetingLink, streamingPlatform,
    selectedTags, requirements, targetAudience,
    visibility, restrictedTo,
    roomName, createVisibilityObject
  ]);


  // Mapping of fields associated with each step for validation purposes
  // Use keys from EventFormData
  const stepFieldsMap: Record<FormStep, (keyof EventFormData)[]> = useMemo(() => ({
    basic: ['title', 'eventDate', 'startTime', 'endTime', 'category', 'duration'],
    details: ['description', 'shortDescription', 'tags', 'requirements', 'targetAudience'],
    location: ['isVirtual', 'location', 'meetingLink', 'streamingPlatform', 'maxAttendees', 'minimumAttendees'],
    tickets: ['isFreeEvent', 'price', 'currency', 'refundPolicy', 'earlyBirdDeadline'],
    images: ['coverImage', 'logo'],
    speakers: ['speakers'],
    review: []
  }), []);


  // --- Refactored Step Validation ---
  const validateStep = useCallback((step: FormStep): boolean => {
    if (step === 'review') return true;
    const fieldsToValidate = stepFieldsMap[step] || [];
    if (fieldsToValidate.length === 0) return true;

    console.log(`[validateStep] Validating step: "${step}" for fields:`, fieldsToValidate);
    const currentData = getFullValidationData();
    const result = eventFormSchema.safeParse(currentData);

    const currentStepErrors: Record<string, string> = {};
    let isStepValid = true; // Assume valid initially

    // 1. Check errors reported by Zod safeParse
    if (!result.success) {
        console.log(`[validateStep] Overall schema parse failed. Issues:`, JSON.stringify(result.error.issues));
        result.error.issues.forEach(issue => {
            const errorPath = issue.path.join('.');
            const relatedField = fieldsToValidate.find(stepField => 
                issue.path.includes(stepField) || errorPath.startsWith(stepField + '.')
            );

            if (relatedField) {
                const errorPathString = issue.path.join('.'); // e.g., "speakers.0.name"
                console.log(`[validateStep] Found Zod error related to step field "${relatedField}": Path=[${issue.path.join(', ')}], Message="${issue.message}"`);
                isStepValid = false;
                
                // Use the full path as the key for nested errors
                const errorKey = errorPathString;

                if (!currentStepErrors[errorKey]) {
                   currentStepErrors[errorKey] = issue.message;
                }
                // Mark the base field as touched when a nested error occurs
                markFieldAsTouched(relatedField as string);
            }
        });
    } else {
         console.log(`[validateStep] Overall schema parse successful.`);
    }
    
    // 2. Explicitly check conditional logic for specific steps
    if (step === 'location') {
        console.log('[validateStep] Performing explicit checks for location step.');
        if (!currentData.isVirtual) {
            // Cast currentData.location to Partial<EventLocation> for type safety
            const loc = currentData.location as Partial<EventLocation> | undefined;
            // The main validation is now done by Zod's refineLocationOrLink.
            // This section can be kept minimal or for very specific UI feedback if needed.
            if (!loc || (!loc.address?.trim() && !loc.city?.trim())) {
                // console.log('[validateStep] Explicit check: Address or City might be missing based on UI state.');
            }
        } else {
            // Virtual Event Logic
            if (currentData.streamingPlatform === 'JITSI') {
                 // Jitsi: Room Name is required
                 if (!currentData.roomName || currentData.roomName.trim().length < 3) {
                     const errorMsg = 'A valid Room Name (at least 3 characters) is required for Jitsi meetings.';
                     console.log(`[validateStep] Explicit check failed: ${errorMsg}`);
                     if (!currentStepErrors['roomName']) {
                         currentStepErrors['roomName'] = errorMsg;
                     }
                     isStepValid = false;
                     markFieldAsTouched('roomName');
                 }
            } else {
                 // Other Virtual Platforms: Meeting Link is required and must be a valid URL
            if (!currentData.meetingLink) {
                 const errorMsg = 'Meeting link is required for virtual events.';
                 console.log(`[validateStep] Explicit check failed: ${errorMsg}`);
                 if (!currentStepErrors['meetingLink']) {
                    currentStepErrors['meetingLink'] = errorMsg;
                 }
                 isStepValid = false;
                 markFieldAsTouched('meetingLink');
            } else if (!z.string().url().safeParse(currentData.meetingLink).success) {
                 const errorMsg = 'Meeting link must be a valid URL (e.g., https://...)';
                 console.log(`[validateStep] Explicit check failed: ${errorMsg}`);
                 if (!currentStepErrors['meetingLink']) {
                   currentStepErrors['meetingLink'] = errorMsg;
                 }
                 isStepValid = false;
                 markFieldAsTouched('meetingLink');
                 }
            }
        }
    } else if (step === 'tickets') {
        console.log('[validateStep] Performing explicit checks for tickets step.');
        // Explicitly check price logic
        if (!currentData.isFreeEvent) {
            // Paid Event: Price is required and must be >= 0.01
            const price = currentData.price; // Use validated data
            let errorMsg = '';

            if (price === undefined || price === null || price < 0) {
                errorMsg = 'Price is required for paid events and must be non-negative';
            } else if (price < 0.01) {
                errorMsg = 'Minimum price for paid events is 0.01';
            }
            // You could add the max price check here too if desired
            // else if (price > 100000) { ... }

            if (errorMsg) {
                 console.log(`[validateStep] Explicit check failed: ${errorMsg}`);
                 if (!currentStepErrors['price']) { // Avoid overwriting Zod error if it existed
                     currentStepErrors['price'] = errorMsg;
                 }
                 isStepValid = false;
                 markFieldAsTouched('price');
            }
        } else {
             // Free event: Clear any potential lingering price error if it exists from previous state
             if (formErrors['price']) {
                  console.log("[validateStep] Explicit check: Clearing price error as event is free.");
                  setFormErrors(prev => { 
                     const next = {...prev}; 
                     delete next['price']; 
                     return next; 
                  });
             }
        }
    }

    // 3. Update form errors state ONLY for fields in this step
    setFormErrors(prevErrors => {
        const nextErrors = { ...prevErrors };
        fieldsToValidate.forEach(fieldNameStr => {
          const fieldName = fieldNameStr as keyof EventFormData;
          let fieldHasErrorInThisStep = false;

          // Check for direct errors or nested errors for this field within currentStepErrors
          for (const errorKey in currentStepErrors) {
              if (errorKey === fieldName || errorKey.startsWith(fieldName + '.')) {
                  nextErrors[errorKey] = currentStepErrors[errorKey]; // Set/update the specific error
                  fieldHasErrorInThisStep = true;
                  // Don't break, allow multiple nested errors if they exist for the same base field
              }
          }

          // If no direct or nested error was found for this base field in this step's validation...
          if (!fieldHasErrorInThisStep) {
              // Clear ALL errors (direct and nested) associated with this fieldName from the main formErrors state
              for (const existingErrorKey in nextErrors) {
                   if (existingErrorKey === fieldName || existingErrorKey.startsWith(fieldName + '.')) {
                      delete nextErrors[existingErrorKey];
                  }
              }
          }
        });
        // Special handling: ensure location/meetingLink errors are cleared if isVirtual toggles
        if (step === 'location') {
            if (currentData.isVirtual && !currentStepErrors['location']) delete nextErrors['location'];
            if (!currentData.isVirtual && !currentStepErrors['meetingLink']) delete nextErrors['meetingLink'];
        }
        return nextErrors;
    });

    // 4. Final logging and return
    if (!isStepValid && !result.success && !Object.keys(currentStepErrors).length) {
        // If Zod failed but no errors were related to *this step*, allow navigation (unless explicit check failed)
         console.log(`[validateStep] Overall schema failed, but no Zod errors are related to fields in this step (${step}). Allowing navigation based on Zod.`);
         // Re-evaluate isStepValid based *only* on explicit checks if any were performed
         if (step === 'location' || step === 'tickets') { // <-- Modified condition
             // Re-check based on explicit results above
             const explicitCheckFailed = ('location' in currentStepErrors || 'meetingLink' in currentStepErrors || 'price' in currentStepErrors);
             isStepValid = !explicitCheckFailed;
             if (!isStepValid) {
                 console.log('[validateStep] Navigation blocked due to explicit check failure.');
             }
         } else {
             isStepValid = true; // Allow navigation if no step errors found by Zod
         }
    }
    
    if (!isStepValid) {
      console.log("[validateStep] Validation failed for step:", step);
      if (Object.keys(currentStepErrors).length > 0) {
         toast.error(`Please fix the errors in this section before proceeding.`);
         console.log("[validateStep] Errors related to this step being set:", currentStepErrors);
      } else {
          console.log("[validateStep] Validation failed but no specific step errors were identified to display.")
      }
    }

    console.log(`[validateStep] Returning navigation validity: ${isStepValid}`);
    return isStepValid;
  }, [
    stepFieldsMap, 
    getFullValidationData, 
    setFormErrors,
    markFieldAsTouched
    // eventFormSchema is implicitly used via safeParse
  ]);


  // --- Handle Field Changes and Validation ---
  const handleEventChange = useCallback((updatedEventPartial: Partial<FormState>) => {
    setEvent(prev => {
      const newState = { ...prev, ...updatedEventPartial };
      // Add detailed logging here
      console.log("-----------------------------------------------------");
      console.log("[EventForm] handleEventChange triggered.");
      console.log("[EventForm] Received updatedEventPartial:", JSON.stringify(updatedEventPartial, null, 2)); // Stringify for better File object visibility
      console.log("[EventForm] Previous event state (prev):", JSON.stringify(prev, null, 2));
      console.log("[EventForm] Next event state for setEvent (newState):", JSON.stringify(newState, null, 2));
      console.log("-----------------------------------------------------");
      return newState;
    });
    setHasChanges(true);
  }, []); // Keep empty dependency array as setEvent is stable

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setEventTitle(newTitle);
    setHasChanges(true);
    // Use debounced validation for title
    validateFieldWithDebounce('title', { ...getFullValidationData(), title: newTitle });
  }, [getFullValidationData, validateFieldWithDebounce]);


  // --- Pass validation to child components via onBlur ---
  const handleBlurValidation = useCallback((fieldName: keyof EventFormData) => {
     markFieldAsTouched(fieldName as string); // Mark field as touched on blur
     const errorMessage = validateField(fieldName, getFullValidationData());
     // Update error state for this specific field
     setFormErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        if (errorMessage) {
            newErrors[fieldName] = errorMessage;
        } else {
            delete newErrors[fieldName];
        }
        return newErrors;
     });
  }, [getFullValidationData, validateField, markFieldAsTouched, setFormErrors]);

  // --- Autosave Logic (using getFullValidationData) ---
// ... existing code ...

  // --- Form Submission (using validateForm) ---
  const handleSubmit = async () => {
    const currentData = getFullValidationData();
    // Call validateForm and check the boolean result. 
    // The hook itself will call setFormErrors internally.
    const isFormValid = validateForm(currentData);

    // Use the boolean result to check validity
    if (!isFormValid) { 
      toast.error('Please fix the errors before submitting.');
      
      // Find the first step with an error and navigate to it
      // Get the errors directly from the state, as validateForm doesn't return them
      const currentErrors = formErrors; // Read from state
      const firstErrorField = Object.keys(currentErrors)[0];
      
      if (firstErrorField) { // Check if there actually is an error field
          let foundStep = false;
          for (const [step, fields] of Object.entries(stepFieldsMap)) {
             // Check if the firstErrorField string starts with any field name in the step's list,
             // or if it exactly matches one.
             const stepHasError = fields.some(field => 
                 firstErrorField === field || firstErrorField.startsWith(field + '.')
             );

             if (stepHasError) {
                setCurrentStep(step as FormStep);
                foundStep = true;
                break;
             }
          }
          // Fallback if error field doesn't match any known step field mapping
          if (!foundStep) {
              console.warn(`Could not map error field "${firstErrorField}" to a form step. Navigating to first step.`);
              setCurrentStep('basic');
          }
      } else {
          // If isFormValid is false but currentErrors is empty, something is wrong.
          // Maybe log an issue or navigate to the first step as a fallback.
          console.warn("Form validation failed, but no errors found in state. Navigating to first step.");
          setCurrentStep('basic'); 
      }
      return;
    }

    setIsSubmitting(true);
    toast.loading('Submitting event...');

    try {
      const formData = new FormData();
      // Append fields from the validated currentData
      const appendIfExists = (key: string, value: string | number | boolean | undefined | null | File) => {
        if (value !== undefined && value !== null && value !== '') {
            // Handle File objects separately
            if (value instanceof File) {
                formData.append(key, value, value.name);
            } else {
                formData.append(key, String(value));
            }
        }
      };

      // Append core fields
      appendIfExists('title', currentData.title);
      appendIfExists('description', currentData.description);
      appendIfExists('shortDescription', currentData.shortDescription);
      appendIfExists('date', currentData.eventDate); // Ensure correct field name
      appendIfExists('startTime', currentData.startTime);
      appendIfExists('endTime', currentData.endTime);
      appendIfExists('category', currentData.category);
      appendIfExists('isVirtual', currentData.isVirtual);

      if (currentData.isVirtual) {
        appendIfExists('streamingPlatform', currentData.streamingPlatform);
        if (currentData.streamingPlatform === 'JITSI') {
           appendIfExists('roomName', currentData.roomName); // Keep sending roomName
           // *** FIX: Send the fully generated meeting link for Jitsi ***
           const jitsiLink = `https://${process.env.NEXT_PUBLIC_JAAS_DOMAIN || '8x8.vc'}/${process.env.NEXT_PUBLIC_JAAS_APP_ID}/${currentData.roomName}`;
           appendIfExists('meetingLink', jitsiLink);
           // appendIfExists('meetingLink', `https://${process.env.NEXT_PUBLIC_JAAS_DOMAIN || '8x8.vc'}/${process.env.NEXT_PUBLIC_JAAS_APP_ID}/${currentData.roomName}`);
        } else {
           appendIfExists('meetingLink', currentData.meetingLink); // Send provided link for others
        }
      } else {
        // For physical events, stringify the location object
        if (currentData.location && typeof currentData.location === 'object') {
          appendIfExists('location', JSON.stringify(currentData.location));
        } else if (typeof currentData.location === 'string') {
          // Fallback if it somehow ends up as a string, though ideally it should always be an object by now
        appendIfExists('location', currentData.location);
        }
      }

      // Append other fields
      appendIfExists('duration', currentData.duration);
      appendIfExists('maxAttendees', currentData.maxAttendees);
      appendIfExists('minimumAttendees', currentData.minimumAttendees);
      appendIfExists('isFreeEvent', currentData.isFreeEvent);
      appendIfExists('price', currentData.price);
      appendIfExists('currency', currentData.currency);
      appendIfExists('refundPolicy', currentData.refundPolicy);
      appendIfExists('earlyBirdDeadline', currentData.earlyBirdDeadline);

      // Append arrays
      if (currentData.tags && currentData.tags.length > 0) {
        formData.append('tags', JSON.stringify(currentData.tags));
      }
      if (currentData.requirements && currentData.requirements.length > 0) {
        formData.append('requirements', JSON.stringify(currentData.requirements));
      }
      if (currentData.targetAudience && currentData.targetAudience.length > 0) {
        formData.append('targetAudience', JSON.stringify(currentData.targetAudience));
      }

      // Append images if they exist (check the structure of your state)
      // Send the File object if it exists
      if (event.coverImage && event.coverImage.file && event.coverImage.file instanceof File) {
        appendIfExists('coverImageFile', event.coverImage.file);
      }
      // Send the cover image details (URL, publicId, etc.) as a JSON string if URL exists
      if (event.coverImage && event.coverImage.url) {
        const coverImageDetails: any = { url: event.coverImage.url };
        if (event.coverImage.publicId) coverImageDetails.publicId = event.coverImage.publicId;
        if (event.coverImage.width) coverImageDetails.width = event.coverImage.width;
        if (event.coverImage.height) coverImageDetails.height = event.coverImage.height;
        if (event.coverImage.attribution) coverImageDetails.attribution = event.coverImage.attribution;
        formData.append('coverImageDetails', JSON.stringify(coverImageDetails));
      }

      // Similarly for logo
      if (event.logo && event.logo.file && event.logo.file instanceof File) {
        appendIfExists('logoFile', event.logo.file);
      }
      if (event.logo && event.logo.url) {
        const logoDetails: any = { url: event.logo.url };
        if (event.logo.publicId) logoDetails.publicId = event.logo.publicId;
        if (event.logo.width) logoDetails.width = event.logo.width;
        if (event.logo.height) logoDetails.height = event.logo.height;
        if (event.logo.attribution) logoDetails.attribution = event.logo.attribution;
        formData.append('logoDetails', JSON.stringify(logoDetails));
      }

      // Append speakers (ensure structure matches backend)
      if (event.speakers && event.speakers.length > 0) {
        // Create a version of speakers array without the File objects for JSON stringification
        const speakersForJson = event.speakers.map(speaker => {
          const { photo, ...restOfSpeaker } = speaker;
          if (photo && typeof photo !== 'string') {
            const { file, ...restOfPhoto } = photo; // Exclude file from photo object
            return { ...restOfSpeaker, photo: Object.keys(restOfPhoto).length > 0 ? restOfPhoto : undefined };
          }
          return speaker; // Return speaker as is if photo is string or undefined
        });
        formData.append('speakers', JSON.stringify(speakersForJson));

        // Append speaker photo files separately, keyed by index
         event.speakers.forEach((speaker, index) => {
          if (speaker.photo && typeof speaker.photo !== 'string' && speaker.photo.file instanceof File) {
            formData.append(`speakerPhotoFile[${index}]`, speaker.photo.file);
            }
         });
      }

      // Append visibility settings
      const visibilityData = createVisibilityObject();
      formData.append('visibility', JSON.stringify(visibilityData));

      console.log("Submitting FormData...");
      // Optional: Log formData entries for debugging (cannot log files directly)
      // for (let [key, value] of formData.entries()) {
      //     console.log(`${key}: ${value instanceof File ? value.name : value}`);
      // }

      await onSubmit(formData);

      // Clear autosaved draft on successful submission
      const draftKey = getDraftStorageKey();
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      setHasChanges(false);
      setLastSaved(null);
      resetTouchedState();
      
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error('Event submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
      toast.dismiss(); // Dismiss loading toast
    }
  };

  // --- Navigation Logic ---
  const handleNextStep = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.stopPropagation(); // Prevent event bubbling
    }

    console.log(`[handleNextStep] Attempting to move from step: ${currentStep}`);
    const stepIsValid = validateStep(currentStep);
    console.log(`[handleNextStep] validateStep returned: ${stepIsValid}`);

    if (!stepIsValid) {
      console.log("[handleNextStep] Validation failed, staying on step:", currentStep);
      return;
    }

    console.log("[handleNextStep] Validation passed, proceeding...");
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    const nextIndex = currentIndex + 1;

    if (nextIndex < steps.length) {
       const nextStepId = steps[nextIndex].id;
       console.log(`[handleNextStep] Setting current step to '${nextStepId}'`);
       setCurrentStep(nextStepId);
    } else {
        console.warn("[handleNextStep] Already on the last step (review). Should be submitting.");
    }
  };

  const prevStep = useCallback(() => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    const prevIndex = currentIndex - 1;

    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
    // If on the first step, the 'Back' button becomes 'Cancel' and calls onClose
  }, [currentStep]);


  // Render different form sections based on currentStep
  const renderFormStep = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <BasicInfoForm
            event={event}
            onEventChange={handleEventChange}
            formErrors={formErrors}
            fieldsTouched={fieldsTouched}
            validateFieldOnBlur={handleBlurValidation}
            clearErrors={clearErrors}
            // BasicInfo specific + validation
            eventTitle={eventTitle}
            handleTitleChange={handleTitleChange}
            validateField={validateField}
            getFullValidationData={getFullValidationData}
            setFormErrors={setFormErrors}
          />
        );
      case 'details':
        return (
          <DetailsForm
            event={event}
            onEventChange={handleEventChange}
            formErrors={formErrors}
            fieldsTouched={fieldsTouched}
            validateFieldOnBlur={handleBlurValidation}
            clearErrors={clearErrors}
            setHasChanges={setHasChanges}
            // Details specific
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            requirements={requirements}
            setRequirements={setRequirements}
            targetAudience={targetAudience}
            setTargetAudience={setTargetAudience}
          />
        );
      case 'location':
        return (
          <LocationForm
            event={event}
            onEventChange={handleEventChange}
            formErrors={formErrors}
            fieldsTouched={fieldsTouched}
            validateFieldOnBlur={handleBlurValidation}
            clearErrors={clearErrors}
            setHasChanges={setHasChanges}
            validateField={validateField}
            getFullValidationData={getFullValidationData}
            setFormErrors={setFormErrors}
            // Location specific
            isVirtual={isVirtual}
            setIsVirtual={setIsVirtual}
            meetingLink={meetingLink}
            setMeetingLink={setMeetingLink}
            streamingPlatform={streamingPlatform}
            setStreamingPlatform={setStreamingPlatform}
            roomName={roomName}
            setRoomName={setRoomName}
            setShowJitsiMeeting={setShowJitsiMeeting}
          />
        );
      case 'tickets':
        return (
          <TicketsForm
            event={event}
            onEventChange={handleEventChange}
            formErrors={formErrors}
            fieldsTouched={fieldsTouched}
            validateFieldOnBlur={handleBlurValidation}
            clearErrors={clearErrors}
            setHasChanges={setHasChanges}
            validateField={validateField}
            getFullValidationData={getFullValidationData}
            setFormErrors={setFormErrors}
          />
        );
      case 'images':
        return (
          <ImagesForm
            event={event}
            onEventChange={handleEventChange}
            formErrors={formErrors}
            fieldsTouched={fieldsTouched}
            validateFieldOnBlur={handleBlurValidation}
            clearErrors={clearErrors}
            setHasChanges={setHasChanges}
          />
        );
      case 'speakers':
         return (
           <SpeakerPhotosForm
             event={event}
             onEventChange={handleEventChange}
             formErrors={formErrors}
             fieldsTouched={fieldsTouched}
             validateFieldOnBlur={handleBlurValidation}
             clearErrors={clearErrors}
             setHasChanges={setHasChanges}
           />
         );
      case 'review':
        return (
          <ReviewStep
            eventData={getFullValidationData()}
            onEditStep={(step) => setCurrentStep(step)}
            steps={steps}
            stepFieldsMap={stepFieldsMap}
          />
        );
      default:
        console.error(`Invalid current step: ${currentStep}. Resetting to basic.`);
        setCurrentStep('basic');
        return <div>Loading...</div>;
    }
  };

  // --- Add back missing function definitions ---
  const saveCurrentProgress = useCallback(async () => {
    const draftKey = getDraftStorageKey();
    if (!draftKey) {
      console.log("Autosave skipped: User ID not available.");
      return;
    }
    if (!eventTitle && !event.description) {
        console.log("Autosave skipped: Title and description are empty.");
        return;
    }
    console.log("Autosaving progress...");
    try {
      const formState = {
        eventTitle,
        event,
        isVirtual,
        streamingPlatform,
        meetingLink,
        visibility,
        restrictedTo,
        selectedTags,
        requirements,
        targetAudience,
        currentStep,
        lastModified: new Date().toISOString()
      };
      localStorage.setItem(draftKey, JSON.stringify(formState));
      setLastSaved(new Date());
      setHasChanges(false);
      toast('Draft saved', {
        duration: 1500,
        icon: <Save size={16} className="text-green-500" />,
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
      toast.error('Failed to save draft');
    }
  }, [
    eventTitle, event, isVirtual, streamingPlatform, meetingLink,
    visibility, restrictedTo,
    selectedTags, requirements, targetAudience, currentStep,
    setLastSaved, setHasChanges, getDraftStorageKey
  ]);

  // --- Effects ---
  // Temporarily comment out autosave-related useEffect hooks
  useEffect(() => {
    // Debounce the save function
    const debouncedSave = debounce(saveCurrentProgress, AUTOSAVE_DEBOUNCE);

    // Clear previous timer if dependencies change
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Set a new timer if there are changes
    if (hasChanges) {
      console.log(`[Autosave Effect] hasChanges is true, scheduling save in ${AUTOSAVE_DEBOUNCE}ms`);
      autosaveTimerRef.current = setTimeout(() => {
        console.log('[Autosave Effect] Timer fired, calling saveCurrentProgress');
        saveCurrentProgress();
      }, AUTOSAVE_DEBOUNCE);
    } else {
      console.log('[Autosave Effect] hasChanges is false, clearing timer');
       if (autosaveTimerRef.current) {
         clearTimeout(autosaveTimerRef.current);
       }
    }

    // Cleanup timer on unmount or dependency change
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        console.log('[Autosave Effect Cleanup] Cleared timer');
      }
    };
  }, [hasChanges, saveCurrentProgress, AUTOSAVE_DEBOUNCE, getDraftStorageKey]);

  // Comment out draft loading logic if it exists and might interfere
  
  // Load draft on initial mount
  useEffect(() => {
    // No need to check isInitialMount.current here if dependency array is empty
    // isInitialMount.current = false; // Remove this line
    const draftKey = getDraftStorageKey();
    if (!draftKey) {
      console.log("Draft loading skipped: User ID not available.");
      return;
    }
    console.log("Attempting to load draft on mount...");
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        console.log("Loaded draft data:", draftData);

        // Restore state from draft
        setEventTitle(draftData.eventTitle || '');
        setEvent(draftData.event || {}); // Ensure default empty object if draft.event is null/undefined
        setIsVirtual(draftData.isVirtual || false);
        setStreamingPlatform(draftData.streamingPlatform || '');
        setMeetingLink(draftData.meetingLink || '');
        setVisibility(draftData.visibility || 'public');
        setRestrictedTo(draftData.restrictedTo || []);
        setSelectedTags(draftData.selectedTags || []);
        setRequirements(draftData.requirements || []);
        setTargetAudience(draftData.targetAudience || []);
        
        // Restore current step if valid
        const savedStep = draftData.currentStep;
        if (steps.some(s => s.id === savedStep)) {
           setCurrentStep(savedStep);
           console.log(`Restored step to: ${savedStep}`);
        } else {
            console.warn(`Saved step "${savedStep}" is invalid, defaulting to 'basic'.`);
            setCurrentStep('basic');
        }
        
        setLastSaved(draftData.lastModified ? new Date(draftData.lastModified) : null);
        
        // Indicate that a draft was just loaded to potentially prevent immediate autosave trigger
        draftJustLoaded.current = true; 
        // Reset hasChanges flag after loading draft
        setHasChanges(false); 

        toast.success('Draft loaded successfully!');

        // Optional: Clear the just-loaded flag shortly after to allow subsequent saves
        setTimeout(() => {
           draftJustLoaded.current = false;
        }, 500); 

      } catch (error) {
        console.error("Failed to parse or load draft:", error);
        toast.error('Could not load saved draft.');
        localStorage.removeItem(draftKey); // Clear corrupted draft
      }
    } else {
        console.log("No draft found in localStorage.");
    }
    // }, []); // Ensure dependency array is empty
  }, [getDraftStorageKey]); // Add getDraftStorageKey to dependencies to reload if userId changes

  // Comment out beforeunload handler if it exists
  /*
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // ... handler logic ...
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]); // Or other dependencies
  */

  // Check for upload in progress before allowing navigation/submission
  const isUploadingFile = typeof window !== 'undefined' && (window as any).__IS_UPLOADING_FILE__;

  return (
    <div className="p-6 space-y-6 bg-gray-800 rounded-lg">
       {/* Form header */}
       <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
         <h2 className="text-2xl font-bold text-white">
           Create New Event
         </h2>
         {/* Action Buttons & Status */}
         <div className="flex items-center gap-3">
           {/* Status indicators */}
           {lastSaved && !hasChanges && !isSubmitting && (
            <div className="text-xs text-green-400 flex items-center gap-1" title={`Last saved: ${lastSaved.toLocaleString()}`}>
              <CheckCircle size={14} />
              <span>Saved</span>
            </div>
           )}
           {hasChanges && !isSubmitting && (
             <button
               type="button"
               // onClick={saveCurrentProgress} // Commented out
               onClick={saveCurrentProgress} // Uncomment this line
               // onClick={() => console.log('Save Draft button clicked (action commented out)')} // Remove this line
               className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
               title="Save draft"
               disabled={isSubmitting}
             >
               <Save className="w-4 h-4" />
               <span>Save Draft</span>
             </button>
           )}
           {isSubmitting && (
             <div className="text-xs text-blue-400 flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting...</span>
              </div>
           )}
           {isUploadingFile && (
             <div className="text-xs text-orange-400 flex items-center gap-1" title="Waiting for file upload to complete...">
                <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Uploading...</span>
              </div>
           )}
           {/* Close Button */}
           <button
             type="button"
             onClick={onClose}
             className="text-gray-500 hover:text-gray-300 transition-colors"
             title="Close form"
             disabled={isSubmitting}
           >
             <X className="w-6 h-6" />
           </button>
         </div>
       </div>

       {/* Progress Steps - Pass steps array */}
       <div className="mb-6">
         <FormSteps currentStep={currentStep} steps={steps} />
       </div>

      {/* Render the current form step content */}
      <div className="flex-grow overflow-y-auto mb-6 pr-2 custom-scrollbar">
        {renderFormStep()}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-auto pt-4 border-t border-gray-700">
        <button
          type="button"
          onClick={currentStep === 'basic' ? onClose : prevStep}
          disabled={isSubmitting || isUploadingFile} // Disable if submitting or uploading
          className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentStep === 'basic' ? 'Cancel' : 'Back'}
        </button>
            {/* Main Action Button (Next / Create Event) */}
            <button
              type="button" // Always type="button"
              // Explicitly call handleSubmit or handleNextStep
              onClick={currentStep === 'review' ? handleSubmit : handleNextStep}
              disabled={isSubmitting || isUploadingFile}
              className={`px-5 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${ 
                currentStep === 'review'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white' // Green for create
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white' // Purple for next
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {/* Update loading text slightly for clarity */}
                  {currentStep === 'review' ? 'Creating...' : 'Processing...'}
                </>
              ) : (
                <>
                  {currentStep === 'review' ? 'Create Event' : 'Next'}
                  {currentStep !== 'review' && <ChevronRight className="w-5 h-5" />}
                </>
              )}
            </button>
      </div>

      {/* Jitsi Meeting Modal for Test - Restore fixed overlay structure */}
      {showJitsiMeeting && roomName && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-1 rounded-lg shadow-xl w-full max-w-4xl h-[70vh] flex flex-col relative">
            <button
              onClick={() => setShowJitsiMeeting(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white z-10 bg-gray-700 rounded-full p-1.5"
              aria-label="Close Jitsi Meeting"
            >
              <X size={18} />
            </button>
            {/* This is the container div JitsiMeeting will try to use - ensure it fills the space */}
            <div id="jaas-test-container" className="w-full flex-grow h-full rounded bg-black" />
            <JitsiMeeting
              roomSlug={roomName}
              displayName={session?.user?.name || 'Organizer (Test)'}
              userEmail={session?.user?.email || undefined}
              userId={session?.user?.id || undefined}
              isModerator={true}
              eventTitle={eventTitle || 'Test Meeting'}
              onClose={() => setShowJitsiMeeting(false)}
              jitsiContainerId="jaas-test-container"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Remove the old SubmitForm definition from inside EventForm
// Ensure export default EventForm is the last statement
export default EventForm;