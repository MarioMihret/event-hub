"use client";

import React, { useState } from 'react';
import { BasicInfoFormProps } from '../../types';
import { AlertCircle, Sparkles, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  event,
  onEventChange,
  formErrors,
  eventTitle,
  handleTitleChange,
  fieldsTouched,
  validateFieldOnBlur
}) => {
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  // Helper to determine if field should show error
  const shouldShowError = (fieldName: string) => {
    return fieldsTouched?.[fieldName] && formErrors[fieldName];
  };

  // Helper for providing input status classes
  const getInputClasses = (fieldName: string) => {
    const baseClasses = "w-full bg-gray-700 border rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none transition-colors";
    
    if (shouldShowError(fieldName)) {
      return `${baseClasses} border-red-500`;
    } else if (fieldsTouched?.[fieldName] && !formErrors[fieldName]) {
      return `${baseClasses} border-green-500`;
    }
    return `${baseClasses} border-gray-600`;
  };

  // Create a proper change handler that updates the event state
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle numeric inputs properly
    if (type === 'number') {
      // First convert to string to handle any undefined values
      const strValue = value.toString();
      // Use parseInt for duration to ensure it's a whole number
      let numericValue;
      if (name === 'duration') {
        numericValue = strValue === '' ? undefined : parseInt(strValue, 10);
      } else {
        numericValue = strValue === '' ? undefined : parseFloat(strValue); // Also allow other numeric fields to be undefined
      }
      
      onEventChange({
        ...event,
        [name]: numericValue
      });
    } else {
      onEventChange({
        ...event,
        [name]: value
      });
    }
  };

  // Handle AI generation for event title
  const handleGenerateTitle = async () => {
    if (!event.category) {
      toast.error('Please select a category first to generate a title');
      return;
    }

    try {
      setIsGeneratingTitle(true);

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: event.category,
          type: 'title',
          additionalInfo: '' // Optional additional context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate title');
      }

      const data = await response.json();
      
      // Use the handleTitleChange function to update the title
      // Create a mock event to pass to handleTitleChange
      const mockEvent = {
        target: {
          value: data.text
        }
      } as React.ChangeEvent<HTMLInputElement>;

      handleTitleChange(mockEvent);

      // Show appropriate message based on whether fallback was used
      if (data.isFromFallback) {
        toast.success('Generated a title using local content (API quota exceeded)');
      } else {
        toast.success('Generated a title for your event');
      }
    } catch (error) {
      console.error('Error generating title:', error);
      toast.error('Failed to generate title. Please try again.');
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
        Basic Information
      </h3>
    
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-gray-300">Event Title *</label>
            <button
              type="button"
              onClick={handleGenerateTitle}
              disabled={isGeneratingTitle || !event.category}
              className="inline-flex items-center text-xs px-2 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 transition-colors disabled:opacity-50"
            >
              {isGeneratingTitle ? (
                <>
                  <Loader className="w-3 h-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Generate
                </>
              )}
            </button>
          </div>
          <input
            name="title"
            type="text"
            value={eventTitle}
            onChange={handleTitleChange}
            onBlur={() => validateFieldOnBlur('title')}
            className={getInputClasses('title')}
            placeholder="Enter event title"
            required
            aria-invalid={!!formErrors.title}
            aria-describedby={formErrors.title ? "title-error" : undefined}
          />
          {formErrors.title && (
            <p id="title-error" className="mt-1 text-sm text-red-500 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              {formErrors.title}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">Choose a clear, specific title (3-100 characters)</p>
        </div>

        <div>
          <label className="block text-gray-300 mb-2">
            Category <span className="text-red-400">*</span>
          </label>
          <select
            name="category"
            value={event.category || ''}
            onChange={handleChange}
            onBlur={() => validateFieldOnBlur('category')}
            className={getInputClasses('category')}
            required
            aria-invalid={!!formErrors.category}
            aria-describedby={formErrors.category ? "category-error" : undefined}
          >
            <option value="">Select category</option>
            <option value="tech">Tech</option>
            <option value="business">Business</option>
            <option value="arts">Arts</option>
            <option value="sports">Sports</option>
            <option value="health">Health</option>
            <option value="education">Education</option>
            <option value="social">Social</option>
            <option value="other">Other</option>
          </select>
          {formErrors.category && (
            <p id="category-error" className="mt-1 text-sm text-red-500 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              {formErrors.category}
            </p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 mb-2">
            Event Date <span className="text-red-400">*</span>
          </label>
          <input
            name="eventDate"
            type="date"
            value={event.eventDate || ''}
            min={new Date().toISOString().split('T')[0]}
            onChange={handleChange}
            onBlur={() => validateFieldOnBlur('eventDate')}
            className={getInputClasses('eventDate')}
            required
            aria-invalid={!!formErrors.eventDate}
            aria-describedby={formErrors.eventDate ? "eventDate-error" : undefined}
          />
          {formErrors.eventDate && (
            <p id="eventDate-error" className="mt-1 text-sm text-red-500 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              {formErrors.eventDate}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">Event date must be in the future</p>
        </div>

        <div>
          <label className="block text-gray-300 mb-2">
            Duration (minutes) <span className="text-red-400">*</span>
          </label>
          <input
            name="duration"
            type="number"
            value={event.duration ?? ''}
            onChange={handleChange}
            onBlur={() => validateFieldOnBlur('duration')}
            className={getInputClasses('duration')}
            placeholder="Enter duration in minutes"
            min="1"
            max="1440"
            required
            aria-invalid={!!formErrors.duration}
            aria-describedby={formErrors.duration ? "duration-error" : undefined}
          />
          {shouldShowError('duration') && (
            <p id="duration-error" className="mt-1 text-sm text-red-500 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              {formErrors.duration}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">Maximum duration: 24 hours (1440 minutes)</p>
        </div>
      </div>
      
      {/* Restore Start Time and End Time Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-300 mb-2">
            Start Time <span className="text-red-400">*</span>
          </label>
          <input
            name="startTime"
            type="time"
            value={event.startTime || ''}
            onChange={handleChange}
            onBlur={() => validateFieldOnBlur('startTime')}
            className={getInputClasses('startTime')}
            required
            aria-invalid={!!formErrors.startTime}
            aria-describedby={formErrors.startTime ? "startTime-error" : undefined}
          />
          {shouldShowError('startTime') && (
            <p id="startTime-error" className="mt-1 text-sm text-red-500 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              {formErrors.startTime}
            </p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 mb-2">
            End Time <span className="text-red-400">*</span>
          </label>
          <input
            name="endTime"
            type="time"
            value={event.endTime || ''}
            onChange={handleChange}
            onBlur={() => validateFieldOnBlur('endTime')}
            className={getInputClasses('endTime')}
            required
            aria-invalid={!!formErrors.endTime}
            aria-describedby={formErrors.endTime ? "endTime-error" : undefined}
          />
          {shouldShowError('endTime') && (
            <p id="endTime-error" className="mt-1 text-sm text-red-500 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              {formErrors.endTime}
            </p>
          )}
        </div>
      </div>
      {/* End Restored Time Inputs */}
    </div>
  );
};

export default BasicInfoForm; 