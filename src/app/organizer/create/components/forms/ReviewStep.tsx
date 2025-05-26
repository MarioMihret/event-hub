"use client";

import React from 'react';
import { FormStep } from '../../types';
import { FullValidationData } from '../../hooks/useFormValidation';
import { Edit, Calendar, Clock, MapPin, Users, Tag, Info, DollarSign, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { format } from 'date-fns'; // For formatting date/time

// Helper function to render detail items consistently - adjusted for inline potential
const DetailItem: React.FC<{ label: string; value?: React.ReactNode; className?: string; onEdit?: () => void; isBlock?: boolean }> = ({
  label,
  value,
  className = '',
  onEdit,
  isBlock = false // Default to inline style for this section
}) => {
  if (!value && value !== 0) return null;
  
  // Base container class
  const containerClass = `flex justify-between items-start group ${className}`;
  // Content class varies based on isBlock
  const contentClass = isBlock 
    ? ""
    : "flex items-baseline"; // Inline style

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        <span className="font-medium text-gray-400 text-sm mr-2">{label}:</span>
        <div className={`text-gray-200 ${isBlock ? 'ml-1 break-words' : 'break-words'}`}>{value}</div>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="ml-4 text-gray-500 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          title={`Edit ${label}`}
        >
          <Edit size={16} />
        </button>
      )}
    </div>
  );
};

// Helper to find the step containing a specific field
const findStepForField = (
  fieldName: keyof FullValidationData,
  steps: { id: FormStep; name: string }[],
  stepFieldsMap: Record<FormStep, (keyof FullValidationData)[]>
): FormStep | undefined => {
  // Handle nested fields (e.g., speakers.0.name -> speakers)
  const baseFieldName = fieldName.split('.')[0] as keyof FullValidationData;
  return steps.find(step => stepFieldsMap[step.id]?.includes(baseFieldName))?.id;
};


interface ReviewStepProps {
  eventData: FullValidationData;
  onEditStep: (stepId: FormStep) => void;
  steps: { id: FormStep; name: string }[];
  stepFieldsMap: Record<FormStep, (keyof FullValidationData)[]>;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ eventData, onEditStep, steps, stepFieldsMap }) => {

  const handleEdit = (field: keyof FullValidationData) => {
    const stepId = findStepForField(field, steps, stepFieldsMap);
    if (stepId) {
      onEditStep(stepId);
    } else {
      console.warn(`Could not find step for field: ${field}`);
      // Optionally navigate to a default step like 'basic'
      onEditStep('basic');
    }
  };

  // Format date and time safely
  const formattedDate = eventData.eventDate
    ? format(new Date(eventData.eventDate + 'T00:00:00'), 'PPP') // Use a neutral time like midnight
    : 'Not set';
  const formattedStartTime = eventData.startTime || 'Not set';
  const formattedEndTime = eventData.endTime || 'Not set';

  // Helper to format location object into a string for display
  const formatLocationToString = (location?: Partial<typeof eventData.location>): string => {
    if (!location) return '-'; // Or 'Not specified'
    
    const parts: string[] = [];
    if (location.address?.trim()) parts.push(location.address.trim());
    if (location.city?.trim()) parts.push(location.city.trim());
    if (location.country?.trim()) parts.push(location.country.trim());
    if (location.postalCode?.trim()) parts.push(location.postalCode.trim());

    if (parts.length === 0) return 'Physical location details not provided';
    return parts.join(', ');
  };

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">
        Review & Create Event
      </h3>
      <p className="text-gray-400">
        Please review all your event details below. Click the edit icon next to any section
        to jump back and make changes. When you're ready, click "Create Event".
      </p>

      {/* Section: Basic Info - Increased Emphasis */}
      <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 space-y-3 mt-6">
        <h4 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
          <Info size={18} /> Basic Information
        </h4>
        {/* Use a 2-column grid for basic info items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <DetailItem label="Title" value={eventData.title} onEdit={() => handleEdit('title')} isBlock={true} /> {/* Keep Title block for length */} 
          <DetailItem label="Category" value={eventData.category} onEdit={() => handleEdit('category')} />
          <DetailItem label="Date" value={formattedDate} onEdit={() => handleEdit('eventDate')} />
          <DetailItem label="Start Time" value={formattedStartTime} onEdit={() => handleEdit('startTime')} />
          <DetailItem label="End Time" value={formattedEndTime} onEdit={() => handleEdit('endTime')} />
          {eventData.duration && 
            <DetailItem label="Duration" value={`${eventData.duration} mins`} onEdit={() => handleEdit('duration')} />
          }
        </div>
      </div>

      {/* Section: Details */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-3">
        <h4 className="text-lg font-semibold text-purple-300 mb-2 flex items-center gap-2">
           <Info size={18} /> Event Details
        </h4>
        {/* Ensure Description uses isBlock=true */} 
        <DetailItem label="Description" value={<pre className="whitespace-pre-wrap text-sm font-sans bg-gray-900/30 p-2 rounded">{eventData.description || '-'}</pre>} onEdit={() => handleEdit('description')} isBlock={true} />
        <DetailItem label="Short Description" value={eventData.shortDescription || '-'} onEdit={() => handleEdit('shortDescription')} isBlock={true} />
      </div>

       {/* Section: Location - Adjust to use isBlock where appropriate */}
       <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-3">
          <h4 className="text-lg font-semibold text-purple-300 mb-2 flex items-center gap-2">
             <MapPin size={18} /> Location & Attendance
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <DetailItem label="Event Type" value={eventData.isVirtual ? 'Virtual' : 'Physical Location'} onEdit={() => handleEdit('isVirtual')} />
            {eventData.isVirtual ? (
              <>
                <DetailItem label="Platform" value={eventData.streamingPlatform || 'Not specified'} onEdit={() => handleEdit('streamingPlatform')} />
                <DetailItem
                  label="Meeting Link"
                  value={eventData.meetingLink ? (
                    <a href={eventData.meetingLink} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline inline-flex items-center gap-1">
                      {eventData.meetingLink} <ExternalLink size={14} />
                    </a>
                  ) : '-'}
                  onEdit={() => handleEdit('meetingLink')}
                  className="md:col-span-2" // Span link across columns if virtual
                />
              </>
            ) : (
              <DetailItem label="Venue/Address" value={formatLocationToString(eventData.location)} onEdit={() => handleEdit('location')} isBlock={true} className="md:col-span-2"/>
            )}
            <DetailItem label="Max Attendees" value={eventData.maxAttendees ?? 'Unlimited'} onEdit={() => handleEdit('maxAttendees')} />
            <DetailItem label="Min Attendees" value={eventData.minimumAttendees ?? 'None'} onEdit={() => handleEdit('minimumAttendees')} />
          </div>
       </div>

       {/* Section: Tickets & Pricing - Adjust to use isBlock where appropriate */}
       <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-3">
          <h4 className="text-lg font-semibold text-purple-300 mb-2 flex items-center gap-2">
             <DollarSign size={18} /> Tickets & Pricing
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <DetailItem label="Ticket Type" value={eventData.isFreeEvent ? 'Free' : 'Paid'} onEdit={() => handleEdit('isFreeEvent')} />
            {!eventData.isFreeEvent && (
               <DetailItem label="Price" value={`${eventData.price ?? '0.00'} ${eventData.currency || 'USD'}`} onEdit={() => handleEdit('price')} />
            )}
            <DetailItem label="Refund Policy" value={eventData.refundPolicy || 'Not specified'} onEdit={() => handleEdit('refundPolicy')} isBlock={true} className="md:col-span-2"/> {/* Span policy */}
             <DetailItem
               label="Early Bird Deadline"
               value={eventData.earlyBirdDeadline ? format(new Date(eventData.earlyBirdDeadline), 'PPP') : 'None'}
               onEdit={() => handleEdit('earlyBirdDeadline')}
             />
          </div>
       </div>

       {/* Section: Images */}
       <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-3">
          <h4 className="text-lg font-semibold text-purple-300 mb-2 flex items-center gap-2">
            <ImageIcon size={18} /> Event Images
            <button type="button" onClick={() => handleEdit('coverImage')} className="ml-auto text-gray-500 hover:text-purple-400"><Edit size={16} /></button>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
             <div>
                <span className="font-medium text-gray-400 text-sm block mb-1">Cover Image:</span>
                {eventData.coverImage?.url ? (
                   <img src={eventData.coverImage.url} alt="Cover" className="rounded-md max-h-40 w-auto object-cover" />
                ) : (
                   <p className="text-gray-500 text-sm">Not set</p>
                )}
             </div>
             <div>
                <span className="font-medium text-gray-400 text-sm block mb-1">Logo:</span>
                {eventData.logo?.url ? (
                   <img src={eventData.logo.url} alt="Logo" className="rounded-md max-h-20 w-auto object-contain bg-gray-700 p-1" />
                ) : (
                   <p className="text-gray-500 text-sm">Not set</p>
                )}
             </div>
          </div>
       </div>

       {/* Section: Speakers */}
       <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-3">
         <h4 className="text-lg font-semibold text-purple-300 mb-2 flex items-center gap-2">
            <Users size={18} /> Speakers
            <button type="button" onClick={() => handleEdit('speakers')} className="ml-auto text-gray-500 hover:text-purple-400"><Edit size={16} /></button>
         </h4>
          {eventData.speakers && eventData.speakers.length > 0 ? (
             <div className="space-y-4">
                {eventData.speakers.map((speaker, index) => (
                   <div key={speaker.id || index} className="flex items-start gap-3 p-3 bg-gray-700/50 rounded">
                      {speaker.photo?.url && (
                         <img src={speaker.photo.url} alt={speaker.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                      )}
                      <div>
                         <p className="font-semibold text-white">{speaker.name}</p>
                         {speaker.bio && <p className="text-sm text-gray-400 mt-1">{speaker.bio.substring(0,100)}{speaker.bio.length > 100 ? '...' : ''}</p>}
                      </div>
                   </div>
                ))}
             </div>
          ) : (
             <p className="text-gray-500 text-sm">No speakers added.</p>
          )}
       </div>

       {/* Maybe add Visibility section here if needed */}

    </div>
  );
};

export default ReviewStep; 