"use client"
import React, { useState } from 'react';
import { Edit2, Trash2, BarChart2, Video, MapPin, Calendar, Clock, Users, ExternalLink, AlertTriangle, CheckCircle2, Clock3, AlertCircle, XCircle, FileCheck, FileEdit, Upload, Globe, Ticket, DollarSign, TrendingUp, Eye, Settings, Play, X as LucideX } from 'lucide-react';
import { Tooltip } from '../../../../Tooltip';
import { Event, EventVisibilityType, StreamingPlatform } from '../../../../../types/event';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

const DEFAULT_EVENT_IMAGE = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80";

// Dynamically import JitsiMeeting component
const JitsiMeeting = dynamic(
  () => import('@/components/JitsiMeeting').then(mod => mod.default).catch(err => {
    console.error('Error loading JitsiMeeting component:', err);
    // Provide a fallback UI if loading fails
    return () => <div className="p-4 text-red-500 bg-red-100 rounded-md">Failed to load meeting component.</div>;
  }),
  { ssr: false }
);

// Helper function to check if URL is from Unsplash
const isUnsplashUrl = (url: string) => {
  return url.includes('images.unsplash.com');
};

// Helper function to determine if Next.js image optimization should be skipped
const shouldSkipOptimization = (url: string) => {
  if (!url) return true;
  if (url.startsWith('/')) return false;
  if (isUnsplashUrl(url)) return true;
  return url.includes('api.dicebear.com') || 
         url.includes('i.pravatar.cc') || 
         url.includes('picsum.photos');
};

// Define an interface for the event prop that might include 'featured'
interface DisplayEvent extends Event {
  featured?: boolean;
  _isUpdatingVisibility?: boolean;
}

interface EventListItemProps {
  event: DisplayEvent; // Use DisplayEvent type
  onDelete?: (id: string) => void;
  onManage?: (id: string) => void;
  onVisibilityControl?: (id: string) => void;
}

const EventListItem: React.FC<EventListItemProps> = ({ 
  event, 
  onDelete, 
  onManage,
  onVisibilityControl
}) => {
  const { data: session } = useSession();
  const [showTestMeetingModal, setShowTestMeetingModal] = useState(false);
  const [currentTestEvent, setCurrentTestEvent] = useState<{ roomName: string; title: string } | null>(null);

  const handleTestMeetingClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click or other underlying actions
    if (event.isVirtual && event.streamingPlatform === 'JITSI' && event.roomName) {
      setCurrentTestEvent({ roomName: event.roomName, title: event.title || 'Test Meeting' });
      setShowTestMeetingModal(true);
    }
  };

  // Enhanced status colors with fallbacks and icons
  const statusConfig = {
    upcoming: {
      color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      icon: Clock3,
      tooltip: 'This event is scheduled in the future'
    },
    ongoing: {
      color: 'bg-green-500/20 text-green-400 border border-green-500/30',
      icon: Clock,
      tooltip: 'This event is happening now'
    },
    completed: {
      color: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
      icon: CheckCircle2,
      tooltip: 'This event has ended'
    },
    cancelled: {
      color: 'bg-red-500/20 text-red-400 border border-red-500/30',
      icon: XCircle,
      tooltip: 'This event has been cancelled'
    },
    expired: {
      color: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      icon: AlertCircle,
      tooltip: 'This event has passed without being marked as completed'
    },
    approved: {
      color: 'bg-green-500/20 text-green-400 border border-green-500/30',
      icon: CheckCircle2,
      tooltip: 'This event has been approved'
    },
    'pending_approval': {
      color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      icon: AlertCircle,
      tooltip: 'This event is awaiting approval'
    },
    draft: {
      color: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
      icon: FileEdit,
      tooltip: 'This event is saved as a draft'
    },
    published: {
      color: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
      icon: Upload,
      tooltip: 'This event is published and visible'
    }
  } as const;

  // Format status text to be more readable
  const formatStatusText = (status: string | undefined): string => {
    if (!status) return 'Upcoming';
    
    // Convert from snake_case or spaces to Title Case
    return status
      .toLowerCase()
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Safe rendering helpers
  const getStatusConfig = (status: string | undefined) => {
    if (!status) return statusConfig.upcoming; // Default fallback
    
    // Convert to lowercase and normalize
    const normalizedStatus = status.toLowerCase().replace(' ', '_');
    return statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.upcoming;
  };

  // Updated formatDate using date-fns
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Date TBD';
    try {
      const date = parseISO(dateString);
      // Example Format: Jul 16, 2024, 5:00 PM
      return format(date, 'MMM d, yyyy, p'); 
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Get attendance display with proper handling of undefined/null values
  const getAttendanceDisplay = () => {
    const attendees = event.attendees || 0;
    const maxAttendees = event.maxAttendees || '∞';
    return `${attendees}/${maxAttendees}`;
  };

  // Get visibility display with proper handling of different formats
  const getVisibilityStatus = (): string => {
    const visibility = event.visibility as EventVisibilityType; // Use imported EventVisibilityType for casting
    if (!visibility) return 'public'; // Default to public if no visibility info

    if (typeof visibility === 'string') {
      return visibility.toLowerCase();
    }
    
    // Check if it's an object and has a status property
    if (typeof visibility === 'object' && visibility !== null && 'status' in visibility && typeof visibility.status === 'string') {
      return visibility.status.toLowerCase();
    }
    
    return 'public'; // Fallback
  };

  // Check if event is in the past
  const isEventExpired = () => {
    if (!event.date) return false;
    
    try {
      const eventDate = new Date(event.date);
      const now = new Date();
      
      // If the event has an end date, use that for comparison
      if (event.endDate) {
        const endDate = new Date(event.endDate);
        return endDate < now;
      }
      
      // If it has a duration, calculate the end time
      if (event.duration && typeof event.duration === 'number') {
        const endTime = new Date(eventDate.getTime() + (event.duration * 60 * 1000));
        return endTime < now;
      }
      
      // Default to checking if the start date is in the past
      return eventDate < now;
    } catch (e) {
      return false;
    }
  };

  // Get effective status, considering event date
  const getEffectiveStatus = (): string => {
    // If event has explicit status, prioritize it
    if (event.status === 'completed' || event.status === 'cancelled') {
      return event.status;
    }
    
    // Auto-detect expired status for past events
    if (isEventExpired() && event.status !== 'ongoing') {
      return 'expired';
    }
    
    // Return the event's actual status or default to upcoming
    return event.status || 'upcoming';
  };

  const imageUrl = event.coverImage?.url || event.image || DEFAULT_EVENT_IMAGE;

  return (
    <>
      <div className={`relative bg-gray-800/70 border border-gray-600/50 rounded-lg p-4 mb-4 shadow-md transition-all duration-200 group ${
        event._isUpdatingVisibility 
          ? 'border-indigo-500/50 shadow-lg shadow-indigo-900/20' 
          : 'hover:shadow-xl hover:border-gray-500/70 hover:-translate-y-1' 
      }`}>
        {/* Loading overlay for the entire card */}
        {event._isUpdatingVisibility && (
          <div className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-md flex items-center gap-1 z-10 shadow-md">
            <div className="w-2 h-2 rounded-full bg-white/90 animate-pulse"></div>
            <span className="text-xs">Updating</span>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Event Image */}
          <div className="w-full sm:w-24 h-24 relative rounded-lg overflow-hidden shrink-0">
            <Image
              src={imageUrl}
              alt={event.title || 'Event image'}
              fill
              className="object-cover"
              unoptimized={shouldSkipOptimization(imageUrl)}
            />
            {event.isVirtual && event.streamingPlatform === 'JITSI' && (
              <div className="absolute top-1 left-1 bg-purple-500/80 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded-sm flex items-center">
                <Video className="w-2.5 h-2.5" />
              </div>
            )}
            {/* Access featured property safely */} 
            {event.featured && (
              <div className="absolute bottom-1 right-1 bg-amber-500/80 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded-sm flex items-center">
                <TrendingUp className="w-2.5 h-2.5" />
              </div>
            )}
          </div>

          {/* Event Details - Takes remaining space */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top row: Title and Status */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="text-lg font-semibold text-white hover:text-purple-300 transition-colors line-clamp-2 break-words">
                {event.title || 'Untitled Event'}
              </h3>
              
              {/* Status Badges - slightly adjusted styling */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                {/* Refined Visibility/Schedule Badge */}
                <Tooltip content={
                  `Visibility: ${getVisibilityStatus()}`
                }>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    getVisibilityStatus() === 'public' ? 'bg-teal-500/20 text-teal-300' : 
                    getVisibilityStatus() === 'private' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {getVisibilityStatus() === 'public' ? <Globe className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                    {formatStatusText(getVisibilityStatus())}
                  </span>
                </Tooltip>

                {/* Effective Status Badge */}
                <Tooltip content={statusConfig[getEffectiveStatus()]?.tooltip || 'Event status'}>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusConfig(getEffectiveStatus()).color}`}>
                    {(() => {
                      const StatusIcon = getStatusConfig(getEffectiveStatus()).icon;
                      return <StatusIcon className="w-3 h-3 mr-1" />;
                    })()}
                    {formatStatusText(getEffectiveStatus())}
                  </span>
                </Tooltip>
              </div>
            </div>

            {/* Date and Time Display */}
            <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
              <Calendar className="w-4 h-4 shrink-0" />
                <span>{formatDate(event.date)}</span>
            </div>
            
            {/* Location/Virtual Info */}
            <div className="flex items-center text-xs text-gray-400 mb-3 gap-1">
              {event.isVirtual ? (
                  <><Video className="w-3.5 h-3.5 shrink-0 text-purple-400" /> <span>Virtual Event</span></>
              ) : event.location?.city || event.location?.address ? (
                  <><MapPin className="w-3.5 h-3.5 shrink-0" /> <span>{event.location?.city || event.location?.address || 'Location TBD'}</span></>
              ) : null}
            </div>

            {/* Description Snippet (optional) */}
            {event.description && (
              <p className="text-xs text-gray-500 line-clamp-1 mb-3">
                {event.description}
              </p>
            )}

          </div>

           {/* Action Buttons - Grouped on the right */}
          <div className="flex sm:flex-col items-center sm:items-end justify-start sm:justify-center gap-2 mt-2 sm:mt-0">
            {/* Conditional Test JaaS Meeting Button */}
            {event.isVirtual && event.streamingPlatform === 'JITSI' && event.roomName && process.env.NEXT_PUBLIC_JAAS_APP_ID && (
              <Tooltip content="Test JaaS Meeting">
                <button
                  onClick={handleTestMeetingClick}
                  className="p-1.5 sm:p-2 rounded-md text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Test JaaS Meeting"
                  disabled={!process.env.NEXT_PUBLIC_JAAS_APP_ID}
                >
                  <Play size={16} />
                </button>
              </Tooltip>
            )}
            {onManage && (
              <Tooltip content="Edit Event">
                <button 
                  onClick={() => onManage(event._id)} 
                  className="p-1.5 rounded-md bg-gray-700/50 hover:bg-gray-600/70 text-blue-400 hover:text-blue-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  aria-label="Edit Event"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
            {onVisibilityControl && (
               <Tooltip content="Visibility Settings">
                <button 
                  onClick={() => onVisibilityControl(event._id)}
                  className="p-1.5 rounded-md bg-gray-700/50 hover:bg-gray-600/70 text-teal-400 hover:text-teal-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                 >
                  <Eye className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip content="Delete Event">
                <button 
                  onClick={() => onDelete(event._id)}
                  className="p-1.5 rounded-md bg-gray-700/50 hover:bg-gray-600/70 text-red-400 hover:text-red-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  aria-label="Delete Event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Jitsi Meeting Modal for Test */}
      {showTestMeetingModal && currentTestEvent?.roomName && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1001] p-4">
          <div className="bg-gray-800 p-1 rounded-lg shadow-xl w-full max-w-4xl h-[70vh] flex flex-col relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTestMeetingModal(false);
                setCurrentTestEvent(null);
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-white z-10 bg-gray-700 rounded-full p-1.5"
              aria-label="Close Jitsi Meeting"
            >
              <LucideX size={18} />
            </button>
            {/* This is the container div JitsiMeeting will try to use - ensure it fills the space */}
            <div id={`jaas-list-item-test-container-${event._id}`} className="w-full flex-grow h-full rounded bg-black" />
            <JitsiMeeting
              roomSlug={currentTestEvent.roomName}
              displayName={session?.user?.name || 'Organizer (Test)'}
              userEmail={session?.user?.email || undefined}
              userId={session?.user?.id || undefined}
              isModerator={true} // Organizer testing is likely a moderator
              eventTitle={currentTestEvent.title}
              onClose={() => {
                setShowTestMeetingModal(false);
                setCurrentTestEvent(null);
              }}
              jitsiContainerId={`jaas-list-item-test-container-${event._id}`}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default EventListItem;