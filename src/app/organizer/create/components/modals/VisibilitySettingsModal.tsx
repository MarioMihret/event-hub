"use client"
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Eye, Globe, Lock, Calendar, Clock, EyeOff, Users, Save, Loader2, AlertTriangle } from 'lucide-react';
import { Event, EventVisibilityType, UpdateVisibilityInput } from '@/types/event'; // Import NEW types
import { toast } from 'react-hot-toast';

interface VisibilitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVisibility: EventVisibilityType;
  onSave: (newVisibility: EventVisibilityType) => void;
  eventId: string; // Added eventId prop
}

// --- Helper function to format date for input ---
const formatDateTimeLocal = (dateString: string | null | Date): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Check if the date is valid before formatting
      if (isNaN(date.getTime())) return '';
      // Format to YYYY-MM-DDTHH:mm (required by datetime-local)
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return ''; // Return empty string on error
    }
};
// --- END Helper function ---

export function VisibilitySettingsModal({
  isOpen,
  onClose,
  initialVisibility,
  onSave,
  eventId, // Destructure eventId
}: VisibilitySettingsModalProps) {
  // Current state being edited
  const [visibilityType, setVisibilityType] = useState<string>('public');
  const [restrictedTo, setRestrictedTo] = useState<string[]>([]);
  
  // State to store the initial values when modal opened
  const [initialType, setInitialType] = useState<string>('public');
  const [initialRestrictedTo, setInitialRestrictedTo] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Helper: Map initial visibility object/string to UI state AND initial state storage ---
  const mapInitialToState = useCallback((vis: EventVisibilityType) => {
    console.log('[Modal mapInitialToState] Mapping initial visibility:', vis);
    let type = 'public';
    let emails: string[] = [];

    if (typeof vis === 'string') {
      type = vis;
      emails = []; // Strings don't have emails associated initially
    } else if (typeof vis === 'object' && vis !== null) {
      type = vis.status || 'public';
      // Only private status has a relevant email list from the initial object
      emails = (type === 'private' && Array.isArray(vis.restrictedTo)) ? vis.restrictedTo : [];
      }
      
    // Set active state for editing
    setVisibilityType(type);
    setRestrictedTo(emails);

    // Set initial state for comparison
    setInitialType(type);
    setInitialRestrictedTo(emails);

  }, []); // Dependencies removed as setStates are stable


  // --- Effect: Reset state when modal opens/closes or initial data changes ---
  useEffect(() => {
    console.log('[Modal useEffect] Running. isOpen:', isOpen, 'Initial Visibility:', initialVisibility);
    if (isOpen) {
      mapInitialToState(initialVisibility);
      setError(null); // Clear errors on open
    } else {
      console.log('[Modal useEffect] Closed. State reset.');
       // Optionally reset state when closing, though mapInitialToState will handle it on reopen
       // setVisibilityType('public');
       // setRestrictedTo([]);
       setError(null);
       setIsLoading(false); // Ensure loading is false when closed
    }
  }, [isOpen, initialVisibility, mapInitialToState]);


  // --- Handler: Visibility type selection ---
  const handleVisibilityChange = (value: string) => {
    console.log('[Modal handleVisibilityChange] New type selected:', value);
    setVisibilityType(value);
    // Reset specific fields when type changes
    if (value !== 'private') {
      setRestrictedTo([]);
    }
  };

  // --- Handler: Restricted emails input ---
  const handleRestrictedToChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const emails = e.target.value.split(',').map(email => email.trim()).filter(Boolean);
    setRestrictedTo(emails);
  };

  // --- Handler: Save button click ---
  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    let newVisibility: UpdateVisibilityInput;

    if (visibilityType === 'private') {
       // Basic email validation (optional but recommended)
       const invalidEmails = restrictedTo.filter(email => !/\S+@\S+\.\S+/.test(email));
       if (invalidEmails.length > 0) {
           setError(`Invalid email format detected: ${invalidEmails.join(', ')}. Please enter valid emails separated by commas.`);
           setIsLoading(false);
      return;
    }
       if (restrictedTo.length === 0) {
           setError('Please add at least one email to the restricted list for private events.');
           setIsLoading(false);
        return;
      }
      newVisibility = { status: 'private', restrictedTo };
    } else {
      // Default to public string, cast to satisfy TS
      newVisibility = visibilityType as 'public';
    }
    
    console.log('[Modal handleSave] Saving new visibility:', newVisibility);
      
    try {
      // Call the onSave prop which should handle the API call
      await onSave(newVisibility);
      console.log('[Modal handleSave] onSave successful.');
      onClose(); // Close modal on successful save
    } catch (err) {
      console.error('[Modal handleSave] Error saving visibility:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while saving.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Check if settings have changed from initial state ---
  const isChanged = useMemo(() => {
    if (visibilityType !== initialType) return true;
    if (visibilityType === 'private') {
      // Compare email lists carefully (order doesn't matter)
      const currentEmailsStr = JSON.stringify([...restrictedTo].sort());
      const initialEmailsStr = JSON.stringify([...initialRestrictedTo].sort());
      return currentEmailsStr !== initialEmailsStr;
        }
    // If type is public/unlisted and hasn't changed, nothing else has changed
    return false;
  }, [visibilityType, restrictedTo, initialType, initialRestrictedTo]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-lg w-full p-6 shadow-xl relative overflow-hidden">
        {/* Overlay loading spinner during saving */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center rounded-xl z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
              <p className="text-white font-medium">Saving visibility settings...</p>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
          disabled={isLoading}
          aria-label="Close visibility settings"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-3 flex items-center">
          <Eye className="w-5 h-5 mr-2 text-indigo-400" />
          Visibility Settings
        </h2>
        <p className="text-gray-400 text-sm mb-5">Control who can see the event</p>

        <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
          {/* Visibility Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Public Option */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                visibilityType === 'public'
                  ? 'border-indigo-500 bg-indigo-500/20 ring-1 ring-indigo-500'
                  : 'border-gray-700 bg-gray-900/50 hover:bg-gray-700/50'
              }`}
              // --- Use new handler ---
              onClick={() => handleVisibilityChange('public')}
            >
              <div className="flex items-center mb-1">
                <Globe className="w-5 h-5 text-indigo-400 mr-2" />
                <h3 className="font-medium text-white">Public</h3>
              </div>
              <p className="text-xs text-gray-400">Visible to everyone</p>
            </div>

            {/* Private Option */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                visibilityType === 'private'
                  ? 'border-indigo-500 bg-indigo-500/20 ring-1 ring-indigo-500'
                  : 'border-gray-700 bg-gray-900/50 hover:bg-gray-700/50'
              }`}
              // --- Use new handler ---
              onClick={() => handleVisibilityChange('private')}
            >
              <div className="flex items-center mb-1">
                <EyeOff className="w-5 h-5 text-indigo-400 mr-2" />
                <h3 className="font-medium text-white">Private</h3>
              </div>
              <p className="text-xs text-gray-400">Only visible to specific people</p>
            </div>
          </div>

          {/* Private Settings */}
          {visibilityType === 'private' && (
             <div className="bg-gray-700/30 border border-indigo-500/30 rounded-lg p-4 mt-4 space-y-3">
              <h4 className="text-sm font-medium text-indigo-300 mb-2">Private Visibility</h4>

              <div>
                <h5 className="text-gray-300 text-sm mb-2">People with Access</h5>
              <div className="mb-3">
                <label className="block text-gray-300 text-sm mb-2">Add People by Email</label>
                <div className="flex gap-2">
                    <textarea
                      id="restrictedTo"
                      placeholder="Enter emails separated by commas (e.g., user1@example.com, user2@test.org)"
                      value={restrictedTo.join(', ')}
                      onChange={handleRestrictedToChange}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  />
                  </div>
                </div>
                <p className="text-xs text-indigo-400 mt-2">Only these people will be able to access the event.</p>
              </div>
            </div>
          )}
        </div> {/* End scrollable area */}

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !isChanged}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
