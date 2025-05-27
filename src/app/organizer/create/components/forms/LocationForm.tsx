import React, { useEffect, useState } from 'react';
import { LocationFormProps } from '../../types';
import { Link } from 'lucide-react';
import { generateJitsiRoomName, createJaaSMeetingUrl } from '@/utils/jitsi';
import { toast } from 'react-hot-toast';

const LocationForm: React.FC<LocationFormProps> = ({
  event,
  onEventChange,
  formErrors,
  fieldsTouched,
  validateFieldOnBlur,
  isVirtual,
  setIsVirtual,
  streamingPlatform,
  setStreamingPlatform,
  meetingLink,
  setMeetingLink,
  roomName,
  setRoomName,
  setShowJitsiMeeting
}) => {
  // Create a change handler that updates the event state
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const keys = name.split('.');

    if (type === 'number') {
      const numericValue = value === '' ? null : parseFloat(value); // Allow empty string to become null for optional numbers
      if (keys.length > 1) {
        onEventChange({
          ...event,
          [keys[0]]: {
            ...(event[keys[0] as keyof typeof event] as object || {}),
            [keys[1]]: numericValue,
          },
        });
      } else {
        onEventChange({
          ...event,
          [name]: numericValue,
        });
      }
    } else {
      if (keys.length > 1) {
        onEventChange({
          ...event,
          [keys[0]]: {
            ...(event[keys[0] as keyof typeof event] as object || {}),
            [keys[1]]: value,
          },
        });
      } else {
        onEventChange({
          ...event,
          [name]: value,
        });
      }
    }
  };

  // Set Jitsi as default and generate room name when switching to virtual event
  useEffect(() => {
    if (isVirtual) {
      if (!streamingPlatform) {
        setStreamingPlatform('JITSI');
      }
      if (streamingPlatform === 'JITSI') {
        const eventId = event?._id || event?.id;

        if (!roomName && eventId) {
          const newTimestamp = Date.now();
          const currentSlug = generateJitsiRoomName(eventId, newTimestamp)
            .trim().toLowerCase();
          setRoomName(currentSlug);
          console.log(`Generated JaaS room slug with eventId ${eventId} and timestamp ${newTimestamp}: ${currentSlug}`);
          
          const jaasAppId = process.env.NEXT_PUBLIC_JAAS_APP_ID;
          if (jaasAppId) {
            const fullJaaSUrl = createJaaSMeetingUrl(jaasAppId, currentSlug);
            setMeetingLink(fullJaaSUrl);
            console.log("Set JaaS meetingLink for submission:", fullJaaSUrl);
          } else {
            toast.error('JaaS App ID is not configured. Cannot create Jitsi meeting link.');
          }

        } else if (!roomName && !eventId) {
          const tempSlug = 'temp-room-pending-save';
          setRoomName(tempSlug);
          setMeetingLink('');
          console.warn("Generated temporary JaaS room slug as eventId is not available:", tempSlug);
          toast("Jitsi room name will be finalized after the event is saved and has a proper ID.");
        } else if (roomName) {
          const jaasAppId = process.env.NEXT_PUBLIC_JAAS_APP_ID;
          if (jaasAppId && (!meetingLink || !meetingLink.includes(roomName) || !meetingLink.includes('8x8.vc'))) {
            const fullJaaSUrl = createJaaSMeetingUrl(jaasAppId, roomName);
            setMeetingLink(fullJaaSUrl);
            console.log("Updated JaaS meetingLink for existing roomName:", fullJaaSUrl);
          } else if (!jaasAppId && streamingPlatform === 'JITSI') {
            toast.error('JaaS App ID is not configured. Cannot update Jitsi meeting link.');
          }
        }
        
      } else if (streamingPlatform === 'MEETJS') {
        // For self-hosted Jitsi, we expect the user to input the full link.
        // We might clear roomName if it was JaaS-generated, or keep it if the user might switch back.
        // For now, let's ensure roomName is cleared if it looks like a JaaS slug and isn't a custom input.
        if (roomName && (roomName === 'temp-room-pending-save' || (event?._id && roomName.startsWith(event._id.substring(0, 8))))) {
          // setRoomName(''); // Optional: clear if it was auto-generated for JaaS
        }
        // The meetingLink will be user-provided.
      } else {
        if (meetingLink && meetingLink.includes('8x8.vc')) {
            console.log("Switched from Jitsi (JaaS), JaaS specific fields (roomName/meetingLink can be cleared if desired).");
        }
      }
    } else {
      console.log("Event is not virtual. Virtual-specific fields can be cleared if desired.");
    }
  }, [isVirtual, streamingPlatform, setStreamingPlatform, roomName, setRoomName, setMeetingLink, event]);

  // Handle Test Meeting button click
  const handleTestMeeting = () => {
    if (streamingPlatform === 'JITSI' && roomName && process.env.NEXT_PUBLIC_JAAS_APP_ID) {
      setShowJitsiMeeting(true); 
    } else if (streamingPlatform === 'JITSI' && !process.env.NEXT_PUBLIC_JAAS_APP_ID) {
      toast.error("JaaS App ID is not configured. Cannot test JaaS meeting.");
    } else if (streamingPlatform === 'MEETJS') {
      if (meetingLink && meetingLink.startsWith('http')) {
        window.open(meetingLink, '_blank', 'noopener,noreferrer');
      } else {
        toast.error("Please enter a valid meeting URL for Self-Hosted Jitsi Meet (e.g., https://meet.example.com/YourRoom).");
      }
    } else if (streamingPlatform === 'CUSTOM' || streamingPlatform === 'ZOOM' || streamingPlatform === 'TEAMS' || streamingPlatform === 'MEET') {
        if (meetingLink && meetingLink.startsWith('http')) {
            window.open(meetingLink, '_blank', 'noopener,noreferrer');
        } else {
            toast.error("Please enter a valid meeting URL for the selected platform.");
        }
    } else {
       toast.error("Please select a platform and ensure a valid meeting link is provided.");
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
        Location & Attendance
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col">
          <label className="block text-gray-300 mb-2">Event Type *</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-white">
              <input
                type="radio"
                name="eventType"
                value="physical"
                checked={!isVirtual}
                onChange={() => {
                  setIsVirtual(false);
                  // When switching to physical, clear JaaS specific fields explicitly if desired
                  // setMeetingLink(''); 
                  // setRoomName('');
                  // setStreamingPlatform(''); 
                }}
                className="text-purple-600"
              />
              Physical Event
            </label>
            <label className="flex items-center gap-2 text-white">
              <input
                type="radio"
                name="eventType"
                value="virtual"
                checked={isVirtual}
                onChange={() => setIsVirtual(true)} // useEffect will handle JITSI defaulting
                className="text-purple-600"
              />
              Virtual Event
            </label>
          </div>
        </div>

        {isVirtual ? (
          <>
            <div>
              <label className="block text-gray-300 mb-2">Streaming Platform</label>
              <select
                name="streamingPlatform"
                value={streamingPlatform || ''} // Ensure controlled component
                onChange={(e) => {
                    const newPlatform = e.target.value;
                    setStreamingPlatform(newPlatform as any);
                    if (newPlatform !== 'JITSI') {
                        // If user switches away from JITSI, clear the auto-generated JaaS meetingLink
                        // and roomName, allowing them to input a custom one.
                        setMeetingLink(''); 
                        // setRoomName(''); // Optional: clear room name or keep if they switch back
                    }
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">Select platform</option>
                <option value="JITSI">Jitsi Meet (via JaaS)</option>
                <option value="MEETJS">Jitsi Meet (Self-Hosted)</option>
                <option value="ZOOM">Zoom</option>
                <option value="TEAMS">Microsoft Teams</option>
                <option value="MEET">Google Meet</option>
                <option value="CUSTOM">Custom Platform</option>
              </select>
              {formErrors.streamingPlatform && <p className="mt-1 text-sm text-red-500">{formErrors.streamingPlatform}</p>}
            </div>
            
            {streamingPlatform === 'JITSI' && (
              <div className="md:col-span-2">
                  <label className="block text-gray-300 mb-2">JaaS Meeting Room (Auto-generated)</label>
                  <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={roomName || 'Generating slug...'} // Shows the slug
                        readOnly
                        className="flex-grow bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-gray-400 cursor-not-allowed"
                        title={meetingLink || "Full JaaS URL will be auto-generated and saved"} // Show full link in tooltip
                      />
                      <button
                        type="button"
                        onClick={handleTestMeeting}
                        disabled={!roomName || !process.env.NEXT_PUBLIC_JAAS_APP_ID}
                        className="px-4 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!roomName ? "Generating room name..." : "Test Jitsi Meeting as Organizer"}
                      >
                        <Link className="w-4 h-4" />
                        Test JaaS
                      </button>
                  </div>
                   <p className="text-xs text-gray-400 mt-1">
                       Full meeting URL (using JaaS App ID: <span className="font-mono text-xs">{process.env.NEXT_PUBLIC_JAAS_APP_ID ? process.env.NEXT_PUBLIC_JAAS_APP_ID.substring(0,15)+"..." : "Not Configured"}</span> and slug <span className="font-mono text-xs">{roomName}</span>) will be: <br/>
                       <span className="font-mono text-xs break-all">{meetingLink || "(Will be generated for JaaS)"}</span>
                   </p>
                   {!process.env.NEXT_PUBLIC_JAAS_APP_ID && <p className="text-xs text-red-500 mt-1">Error: NEXT_PUBLIC_JAAS_APP_ID is not set in environment variables. JaaS link cannot be generated.</p>}
              </div>
            )}

            {(streamingPlatform === 'CUSTOM' || streamingPlatform === 'ZOOM' || streamingPlatform === 'TEAMS' || streamingPlatform === 'MEET' || streamingPlatform === 'MEETJS') && (
              <div className="md:col-span-2">
                <label htmlFor="meetingLink" className="block text-gray-300 mb-2">
                  {streamingPlatform === 'MEETJS' ? 'Jitsi Meet URL (Self-Hosted)' : 
                   streamingPlatform === 'CUSTOM' ? 'Custom Meeting Link' : 
                   `${streamingPlatform.charAt(0).toUpperCase() + streamingPlatform.slice(1).toLowerCase()} Meeting Link`} * 
                </label>
                <input
                  id="meetingLink"
                  name="meetingLink"
                  type="url"
                  value={meetingLink || ''}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  onBlur={() => validateFieldOnBlur('meetingLink')}
                  placeholder={streamingPlatform === 'MEETJS' ? 'e.g., https://meet.example.com/YourRoomName' : 'e.g., https://zoom.us/j/12345'}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
                />
                {fieldsTouched.meetingLink && formErrors.meetingLink && <p className="mt-1 text-sm text-red-500">{formErrors.meetingLink}</p>}
                <button
                    type="button"
                    onClick={handleTestMeeting}
                    disabled={!meetingLink || !meetingLink.startsWith('http')}
                    className="mt-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!meetingLink ? "Please enter a meeting link" : "Test Meeting Link"}
                >
                    <Link className="w-4 h-4" />
                    Test Link
                </button>
              </div>
            )}
          </>
        ) : (
          // Physical Location Inputs - REPLACED SINGLE INPUT WITH DETAILED FIELDS
          <>
            <div className="md:col-span-2">
              <label htmlFor="location.address" className="block text-gray-300 mb-2">Address</label>
              <input
                id="location.address"
                name="location.address"
                type="text"
                value={event.location?.address || ''}
                onChange={handleChange}
                onBlur={() => validateFieldOnBlur('location.address')}
                className={`w-full bg-gray-700 border ${ (fieldsTouched?.['location.address'] && formErrors?.['location.address']) ? 'border-red-500' : 'border-gray-600' } rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none`}
                placeholder="e.g., 123 Main St"
              />
              {(fieldsTouched?.['location.address'] && formErrors?.['location.address']) && <p className="mt-1 text-sm text-red-500">{formErrors['location.address']}</p>}
            </div>

            <div>
              <label htmlFor="location.city" className="block text-gray-300 mb-2">City</label>
              <input
                id="location.city"
                name="location.city"
                type="text"
                value={event.location?.city || ''}
                onChange={handleChange}
                onBlur={() => validateFieldOnBlur('location.city')}
                className={`w-full bg-gray-700 border ${ (fieldsTouched?.['location.city'] && formErrors?.['location.city']) ? 'border-red-500' : 'border-gray-600' } rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none`}
                placeholder="e.g., Addis Ababa"
              />
              {(fieldsTouched?.['location.city'] && formErrors?.['location.city']) && <p className="mt-1 text-sm text-red-500">{formErrors['location.city']}</p>}
            </div>

            <div>
              <label htmlFor="location.country" className="block text-gray-300 mb-2">Country</label>
              <input
                id="location.country"
                name="location.country"
                type="text"
                value={event.location?.country || ''}
                onChange={handleChange}
                onBlur={() => validateFieldOnBlur('location.country')}
                className={`w-full bg-gray-700 border ${ (fieldsTouched?.['location.country'] && formErrors?.['location.country']) ? 'border-red-500' : 'border-gray-600' } rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none`}
                placeholder="e.g., Ethiopia"
              />
              {(fieldsTouched?.['location.country'] && formErrors?.['location.country']) && <p className="mt-1 text-sm text-red-500">{formErrors['location.country']}</p>}
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="location.postalCode" className="block text-gray-300 mb-2">Postal Code (Optional)</label>
              <input
                id="location.postalCode"
                name="location.postalCode"
                type="text"
                value={event.location?.postalCode || ''}
                onChange={handleChange}
                onBlur={() => validateFieldOnBlur('location.postalCode')}
                className={`w-full bg-gray-700 border ${ (fieldsTouched?.['location.postalCode'] && formErrors?.['location.postalCode']) ? 'border-red-500' : 'border-gray-600' } rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none`}
                placeholder="e.g., 1000"
              />
              {(fieldsTouched?.['location.postalCode'] && formErrors?.['location.postalCode']) && <p className="mt-1 text-sm text-red-500">{formErrors['location.postalCode']}</p>}
            </div>
          </>
        )}

        <div>
          <label className="block text-gray-300 mb-2">Maximum Attendees <span className="text-red-500">*</span></label>
          <input
            name="maxAttendees"
            type="number"
            value={event.maxAttendees ?? 100}
            onChange={handleChange}
            onBlur={() => validateFieldOnBlur('maxAttendees')}
            className={`w-full bg-gray-700 border ${ (fieldsTouched?.maxAttendees && formErrors.maxAttendees) ? 'border-red-500' : 'border-gray-600' } rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none`}
            placeholder="Enter maximum attendees"
            min="1"
            required
          />
          {(fieldsTouched?.maxAttendees && formErrors.maxAttendees) && <p className="mt-1 text-sm text-red-500">{formErrors.maxAttendees}</p>}
        </div>

        <div>
          <label className="block text-gray-300 mb-2">Minimum Attendees <span className="text-gray-500 text-xs">(optional)</span></label>
          <input
            name="minimumAttendees"
            type="number"
            value={event.minimumAttendees ?? 0} // Default to 0 for optional
            onChange={handleChange}
            onBlur={() => validateFieldOnBlur('minimumAttendees')}
            className={`w-full bg-gray-700 border ${ (fieldsTouched?.minimumAttendees && formErrors.minimumAttendees) ? 'border-red-500' : 'border-gray-600' } rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none`}
            placeholder="Enter minimum attendees"
            min="0"
          />
          {(fieldsTouched?.minimumAttendees && formErrors.minimumAttendees) && <p className="mt-1 text-sm text-red-500">{formErrors.minimumAttendees}</p>}
        </div>
      </div>
    </div>
  );
};

export default LocationForm; 