import { Event, EventLocation } from '@/types/event';
import { Dispatch, SetStateAction } from "react";

// Define the missing types locally
export interface RestrictedTo {
  id: string;
  name: string;
  email?: string;
}

// Visibility-related types
export type VisibilityStatus = 'public' | 'private';
export type StreamingPlatformType = 'JITSI' | 'MEETJS' | 'ZOOM' | 'TEAMS' | 'MEET' | 'CUSTOM' | '';

// Add FormStep type definition
export type FormStep = 'basic' | 'details' | 'location' | 'tickets' | 'images' | 'speakers' | 'review';

// Interface for visibility object
export interface VisibilityObject {
  status?: string;
  isVisible?: boolean;
  scheduledFor?: string;
  scheduledUntil?: string;
  restrictedTo?: string[];
}

// Form state interface without extending Event
export interface FormState {
  _id?: string;
  id?: string;
  description: string;
  shortDescription: string;
  location?: Partial<EventLocation>;
  eventDate: string;
  startTime: string;
  endTime: string;
  category: string;
  duration: number;
  maxAttendees: number;
  minimumAttendees: number;
  price: number;
  isFreeEvent?: boolean;
  currency?: string;
  refundPolicy?: string;
  earlyBirdDeadline?: string;
  // Add visibility properties
  visibilityStatus?: 'public' | 'private';
  scheduledFor?: string;
  scheduledUntil?: string;
  // Add image fields
  coverImage?: {
    url: string;
    publicId: string;
    width: number;
    height: number;
    file?: File;
    attribution?: {
      name: string;
      url: string;
      source: string;
      sourceUrl: string;
    };
  };
  logo?: {
    url: string;
    publicId: string;
    width: number;
    height: number;
    file?: File;
    attribution?: {
      name: string;
      url: string;
      source: string;
      sourceUrl: string;
    };
  };
  speakers?: Array<{
    id: string;
    name: string;
    role: string;
    bio: string;
    photo?: {
      url: string;
      publicId: string;
      width: number;
      height: number;
      file?: File;
      attribution?: {
        name: string;
        url: string;
        source: string;
        sourceUrl: string;
      };
    };
  }>;
}

// Validation field handler type
export type ValidateFieldHandler = (fieldName: string) => void;

// Props for form components
export interface FormSectionProps {
  event: FormState;
  onEventChange: (event: FormState) => void;
  formErrors: Record<string, string>;
  clearErrors: (field?: string) => void;
  fieldsTouched: Record<string, boolean>;
  validateFieldOnBlur: ValidateFieldHandler;
}

// Props for EventForm component
export interface EventFormProps {
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  eventToEdit?: Event | null;
}

// Extend FormSectionProps to include setHasChanges for relevant forms
interface FormSectionPropsWithChanges extends FormSectionProps {
  setHasChanges: Dispatch<SetStateAction<boolean>>;
}

// Props for TicketsForm component
// Ensure this extends FormSectionPropsWithChanges
export interface TicketsFormProps extends FormSectionPropsWithChanges {
  validateField: (fieldName: string, data: any) => string;
  getFullValidationData: () => any;
  setFormErrors: Dispatch<SetStateAction<Record<string, string>>>;
}

// Props for ImagesForm component
// Ensure this extends FormSectionPropsWithChanges
export interface ImagesFormProps extends FormSectionPropsWithChanges {}

// Props for SpeakerPhotosForm component
// Ensure this extends FormSectionPropsWithChanges
export interface SpeakerPhotosFormProps extends FormSectionPropsWithChanges {}

// Props for BasicInfoForm component (Should extend FormSectionProps)
export interface BasicInfoFormProps extends FormSectionProps {
  eventTitle: string;
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  validateField: (fieldName: string, data: any) => string;
  getFullValidationData: () => any;
  setFormErrors: Dispatch<SetStateAction<Record<string, string>>>;
}

// Props for DetailsForm component (Should extend FormSectionPropsWithChanges)
export interface DetailsFormProps extends FormSectionPropsWithChanges {
  selectedTags: string[];
  setSelectedTags: Dispatch<SetStateAction<string[]>>;
  requirements: string[];
  setRequirements: Dispatch<SetStateAction<string[]>>;
  targetAudience: string[];
  setTargetAudience: Dispatch<SetStateAction<string[]>>;
  // setHasChanges is inherited from FormSectionPropsWithChanges
}

// Props for LocationForm component (Should extend FormSectionPropsWithChanges)
export interface LocationFormProps extends FormSectionPropsWithChanges {
  isVirtual: boolean;
  setIsVirtual: (isVirtual: boolean) => void;
  streamingPlatform: StreamingPlatformType;
  setStreamingPlatform: (platform: StreamingPlatformType) => void;
  meetingLink: string; // Base URL or other platform link
  setMeetingLink: (link: string) => void;
  roomName: string | null; // Add roomName prop (can be null initially)
  setRoomName: (name: string | null) => void; // Add setter prop
  setShowJitsiMeeting: (show: boolean) => void;
  // Remove generateJitsiLink as it's handled internally now or not needed
  // setHasChanges is inherited
  validateField: (fieldName: string, data: any) => string;
  getFullValidationData: () => any;
  setFormErrors: Dispatch<SetStateAction<Record<string, string>>>;
}

// Props for VisibilityForm component
export interface VisibilityFormProps extends FormSectionProps {
  restrictedToUsers: RestrictedTo[];
  setRestrictedToUsers: Dispatch<SetStateAction<RestrictedTo[]>>;
}

// Create a common interface for form errors
export interface FormErrors {
  [key: string]: string;
} 