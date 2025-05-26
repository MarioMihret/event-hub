// Event Status and Category Types
export type EventStatus = "draft" | "upcoming" | "ongoing" | "live" | "completed" | "cancelled";
export type EventCategory = "tech" | "business" | "arts" | "sports" | "health" | "education" | "social" | "other";
export type EventTicketType = 'standard' | 'vip' | 'early-bird';
export type EventSkillLevel = "beginner" | "intermediate" | "advanced" | "all-levels";
export type StreamingPlatform = 'JITSI' | 'zoom' | 'teams' | 'meet' | 'other';
export type SponsorTier = 'gold' | 'silver' | 'bronze';
export type DateRange = [string, string];

// Image Types
export interface ImageAttribution {
  photographer?: string;
  username?: string;
  source?: string;
  link?: string;
}

export interface ImageObject {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  attribution?: ImageAttribution;
  file?: File;
}

// Location Types
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface EventLocation {
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Ticket Types
export interface EventTicket {
  id: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  sold: number;
  description?: string;
  validFrom?: Date;
  validUntil?: Date;
}

// Organizer and Sponsor Types
export interface EventOrganizer {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  company?: string;
}

// Adjusted EventSponsor to match sanitized input: id is usually generated on save or not part of input for creation.
export interface EventSponsorInput { // Renamed to EventSponsorInput for clarity or adjust EventSponsor
  name: string;
  logo?: string;
  website?: string;
  tier?: SponsorTier; // Assuming SponsorTier is defined (e.g., 'gold', 'silver')
}

export interface EventSponsor extends EventSponsorInput { // EventSponsor can extend this and add id if needed post-creation
  id: string;
}

// --- NEW: Refined Event Visibility Types --- 

type BaseVisibility = {
  restrictedTo?: string[]; // Optional list of emails/IDs for restricted access
};

// Explicit object types for each status
type PublicVisibility = { status: 'public'; } & BaseVisibility;
type PrivateVisibility = { status: 'private'; restrictedTo: string[]; } & BaseVisibility;
// REMOVED UnlistedVisibility
// type UnlistedVisibility = { status: 'unlisted'; } & BaseVisibility;
// REMOVED ScheduledVisibility

// Union of all possible visibility object types
export type EventVisibilityObject = 
  | PublicVisibility 
  | PrivateVisibility;
  // REMOVED UnlistedVisibility
  // | UnlistedVisibility;
  // REMOVED ScheduledVisibility

// The main EventVisibilityType allows string literals OR the object types
export type EventVisibilityType = 
  | 'public' 
  | 'private' 
  // REMOVED 'unlisted' string literal
  // | 'unlisted'
  // REMOVED 'scheduled' string literal
  | EventVisibilityObject;

// Input type for updating visibility (could be a string or a specific object)
export type UpdateVisibilityInput = 
 | 'public' 
 | 'private' 
 // REMOVED 'unlisted' string literal
 // | 'unlisted' 
 // REMOVED 'scheduled' string literal
 | Extract<EventVisibilityObject, { status: 'public' }>
 | Extract<EventVisibilityObject, { status: 'private' }>;
 // REMOVED Extract<EventVisibilityObject, { status: 'unlisted' }>
 // REMOVED Extract<EventVisibilityObject, { status: 'scheduled' }>

// --- END: Refined Event Visibility Types ---

// Main Event Interface
export interface Event {
  _id: string;
  title: string;
  shortDescription?: string;
  description: string;
  category: EventCategory;
  date: string;
  endDate?: string;
  duration?: number;
  location?: EventLocation;
  isVirtual: boolean;
  meetingLink?: string;
  roomName?: string;
  streamingPlatform?: StreamingPlatform;
  organizerId: string;
  organizer: EventOrganizer;
  price: number;
  currency: string;
  tickets?: EventTicket[];
  attendees: number;
  maxAttendees?: number;
  minimumAttendees?: number;
  status: EventStatus;
  visibility: EventVisibilityType;
  skillLevel?: EventSkillLevel;
  requirements?: string[];
  targetAudience?: string[];
  agenda?: EventAgendaItem[];
  tags?: string[];
  
  // Legacy image field as string URL
  image?: string;
  
  // New image fields as objects with attribution
  coverImage?: ImageObject;
  logo?: ImageObject;
  
  registrationDeadline?: string;
  earlyBirdDeadline?: string;
  refundPolicy?: string;
  metadata: EventMetadata;
  
  // Add top-level timestamps for easier access and consistency with eventInput
  createdAt?: string;
  updatedAt?: string;

  // Engagement counts
  viewCount?: number;
  likeCount?: number;
  shareCount?: number;
  
  // --- NEW: Field computed by API for list display ---
  computedVisibility?: 'visible' | 'private_accessible' | 'scheduled_future' | 'scheduled_ended' | 'denied';
}

// Filter and Component Props Types
export interface FilterOptions {
  date?: string;
  dateRange?: DateRange;
  location?: string;
  category?: EventCategory;
  priceRange?: [number, number];
  status?: EventStatus;
  isVirtual?: boolean;
  isFree?: boolean;
  hideExpired?: boolean;
  tags?: string[];
  skillLevel?: EventSkillLevel;
  featured?: boolean;
  organizerId?: string;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export interface FilterSectionProps {
  activeFilters: FilterOptions;
  onFilter: (filters: FilterOptions) => void;
  onReset: () => void;
  onClose: () => void;
}

export interface EventCardProps {
  event: Event;
  onViewDetails?: (event: Event) => void;
  loading?: boolean;
}

export type CreateEventInput = Omit<Event, "_id" | "metadata" | "attendees" | "visibility" | "image" | "speakers" | "organizer"> & {
  attendees?: number;
  metadata?: Partial<EventMetadata>;
  visibility: EventVisibilityType;
  coverImage?: ImageObject;
  speakers?: EventSpeaker[];
  organizerId: string;
  organizer?: Partial<EventOrganizer>;
  title: string;
  description: string;
  shortDescription?: string;
  category: EventCategory;
  date: string;
  endDate?: string;
  duration?: number;
  location?: EventLocation;
  isVirtual: boolean;
  meetingLink?: string;
  roomName?: string;
  streamingPlatform?: StreamingPlatform;
  price: number;
  currency: string;
  tickets?: EventTicket[];
  maxAttendees?: number;
  minimumAttendees?: number;
  status: EventStatus;
  skillLevel?: EventSkillLevel;
  requirements?: string[];
  targetAudience?: string[];
  agenda?: EventAgendaItem[];
  tags?: string[];
  registrationDeadline?: string;
  earlyBirdDeadline?: string;
  refundPolicy?: string;
  sponsors?: EventSponsorInput[];
  faq?: Array<{ question: string; answer: string }>;
  additionalDetails?: Record<string, any>;
  contactEmail?: string;
  contactPhone?: string;
  venueDetails?: string;
  notesForAttendees?: string;
};

export type UpdateEventInput = Partial<Omit<Event, "_id" | "metadata" | "attendees" | "visibility">> & {
  attendees?: number;
  metadata?: Record<string, any>;
  visibility?: UpdateVisibilityInput;
};

// Keep EventMetadata and EventAgendaItem
export interface EventMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
}

export interface EventSpeaker {
  name: string;
  title?: string;
  bio?: string;
  avatar?: Partial<ImageObject>;
  socialLinks?: Array<{ platform: string; url: string }>;
}

export interface EventAgendaItem {
  title: string;
  description?: string;
  time?: Date;
  duration?: number;
  speaker?: string;
}

// Define EventFaqItem if it's more complex or used elsewhere, otherwise inline is fine for CreateEventInput
// export interface EventFaqItem { 
//   question: string;
//   answer: string;
// }