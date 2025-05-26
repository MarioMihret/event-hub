"use client";

import React, { useState } from 'react';
import { FormSectionProps, DetailsFormProps } from '../../types';
import { Sparkles, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AiGenerationState {
  isGenerating: boolean;
  field: 'shortDescription' | 'description' | null;
}

const DetailsForm: React.FC<DetailsFormProps> = ({
  event,
  onEventChange,
  formErrors,
  fieldsTouched,
  validateFieldOnBlur,
  selectedTags,
  setSelectedTags,
  requirements,
  setRequirements,
  targetAudience,
  setTargetAudience
}) => {
  const [aiGeneration, setAiGeneration] = useState<AiGenerationState>({
    isGenerating: false,
    field: null
  });

  // Create a change handler that updates the event state
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onEventChange({
      ...event,
      [name]: value
    });
  };

  // Handle AI generation for descriptions
  const handleGenerateText = async (field: 'shortDescription' | 'description') => {
    if (!event.category) {
      toast.error('Please select a category first to generate content');
      return;
    }

    try {
      setAiGeneration({ isGenerating: true, field });

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: event.category,
          type: field === 'description' ? 'description' : 'shortDescription',
          additionalInfo: '' // Optional additional context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate text');
      }

      const data = await response.json();
      
      // Update the form with the generated text
      onEventChange({
        ...event,
        [field]: data.text
      });

      // Show appropriate message based on whether fallback was used
      if (data.isFromFallback) {
        toast.success(`Generated ${field === 'description' ? 'description' : 'short description'} using local content (API quota exceeded)`);
      } else {
        toast.success(`Generated ${field === 'description' ? 'description' : 'short description'} for your event`);
      }
    } catch (error) {
      console.error('Error generating text:', error);
      toast.error('Failed to generate text. Please try again.');
    } finally {
      setAiGeneration({ isGenerating: false, field: null });
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
        Event Details
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-gray-300">Short Description *</label>
            <button
              type="button"
              onClick={() => handleGenerateText('shortDescription')}
              disabled={aiGeneration.isGenerating}
              className="inline-flex items-center text-xs px-2 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 transition-colors"
            >
              {aiGeneration.isGenerating && aiGeneration.field === 'shortDescription' ? (
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
          <textarea
            name="shortDescription"
            value={event.shortDescription || ''}
            onChange={handleChange}
            onBlur={() => validateFieldOnBlur('shortDescription')}
            className={`w-full bg-gray-700 border ${formErrors.shortDescription ? 'border-red-500' : 'border-gray-600'} rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none`}
            placeholder="Brief description (max 150 chars)"
            rows={2}
            required
          ></textarea>
          {formErrors.shortDescription && <p className="mt-1 text-sm text-red-500">{formErrors.shortDescription}</p>}
        </div>

        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-gray-300">Full Description *</label>
            <button
              type="button"
              onClick={() => handleGenerateText('description')}
              disabled={aiGeneration.isGenerating}
              className="inline-flex items-center text-xs px-2 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 transition-colors"
            >
              {aiGeneration.isGenerating && aiGeneration.field === 'description' ? (
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
          <textarea
            name="description"
            value={event.description || ''}
            onChange={handleChange}
            onBlur={() => validateFieldOnBlur('description')}
            className={`w-full bg-gray-700 border ${formErrors.description ? 'border-red-500' : 'border-gray-600'} rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none`}
            placeholder="Detailed event description (supports markdown)"
            rows={5}
            required
          ></textarea>
          {formErrors.description && <p className="mt-1 text-sm text-red-500">{formErrors.description}</p>}
        </div>
      </div>
    </div>
  );
};

export default DetailsForm; 