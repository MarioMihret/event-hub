"use client";

import React, { useState } from 'react';
import { CloudinaryFolder } from '@/utils/cloudinary';
import ImageUpload from '@/components/ImageUpload';
import { ImagesFormProps } from '../../types';
import { toast } from 'react-hot-toast';
import { uploadFile } from '@/utils/fileUpload';
import { Image as ImageIcon, Loader } from 'lucide-react';
import { PexelsPhoto } from '@/utils/pexelsApi';
import { downloadImageAsFile } from '@/utils/pexelsApi';
import PexelsImageSelector from '@/components/PexelsImageSelector';

const ImagesForm: React.FC<ImagesFormProps> = ({
  event,
  onEventChange,
  formErrors,
  clearErrors,
  fieldsTouched,
  validateFieldOnBlur,
  setHasChanges
}) => {
  const [isUploading, setIsUploading] = useState<{
    coverImage: boolean;
    logo: boolean;
  }>({
    coverImage: false,
    logo: false
  });
  
  const [showPexelsSelector, setShowPexelsSelector] = useState<{
    isOpen: boolean;
    field: 'coverImage' | 'logo' | null;
  }>({
    isOpen: false,
    field: null
  });

  const handleImageSelected = async (
    file: File, 
    field: 'coverImage' | 'logo', 
    folder: CloudinaryFolder,
    attribution?: typeof event.coverImage.attribution // Optional attribution parameter
  ) => {
    // Set the global upload flag BEFORE starting the upload
    if (typeof window !== 'undefined') {
      (window as any).__IS_UPLOADING_FILE__ = true;
    }
    try {
      // Set loading state for this field
      setIsUploading(prev => ({ ...prev, [field]: true }));
      
      // Clear any existing errors
      clearErrors(field);
      
      console.log(`Uploading ${field}:`, file.name, file.size, file.type);
      
      // Add validation for file size and type before attempting upload
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Image file is too large. Please use an image under 5MB.');
      }
      
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please use JPG, PNG, GIF or WebP format.');
      }
      
      // Add retry logic for the upload with improved error handling
      let attempts = 0;
      const maxAttempts = 3;
      let uploadResult = null;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          // Show toast only on retry attempts
          if (attempts > 0) {
            toast.loading(`Retrying upload... (attempt ${attempts + 1}/${maxAttempts})`, 
              { id: `upload-retry-${field}`, duration: Math.pow(2, attempts) * 1000 }
            );
          }
          
          // Upload the file using our utility
          uploadResult = await uploadFile(file, folder);
          break; // Exit loop on success
        } catch (error) {
          lastError = error;
          attempts++;
          
          console.error(`Upload attempt ${attempts} failed:`, error);
          
          if (attempts < maxAttempts) {
            const retryDelay = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      
      if (!uploadResult) {
        throw lastError || new Error('Failed to upload after multiple attempts');
      }
      
      console.log(`Upload successful:`, uploadResult);
      
      if (uploadResult && uploadResult.secure_url) {
        // Update the event state with the image info
        const imageObject = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          width: uploadResult.width,
          height: uploadResult.height,
          file: file,
          // Use passed attribution if provided, otherwise fallback to uploadResult.attribution (if any)
          ...(attribution && { attribution: attribution }), 
          ...(!attribution && uploadResult.attribution && { attribution: uploadResult.attribution })
        };

        const updatedEvent = {
          ...event,
          [field]: imageObject
        };
        
        // Update form state
        onEventChange(updatedEvent);
        
        // Show success message
        toast.success(`${field === 'coverImage' ? 'Cover image' : 'Logo'} uploaded successfully`);
        setHasChanges(true); // Mark change after successful upload
      } else {
        throw new Error('Upload response is missing required fields');
      }
    } catch (error) {
      console.error(`Error uploading ${field}:`, error);
      
      // Format a more user-friendly error message
      let errorMessage = 'Failed to upload image';
      
      if (error instanceof Error) {
        // Handle common error scenarios with more helpful messages
        if (error.message.includes('timeout') || error.message.includes('Timeout')) {
          errorMessage = 'Upload timed out. Please try with a smaller image or check your connection.';
        } else if (error.message.includes('failed with status: 413')) {
          errorMessage = 'Image is too large. Please use an image under 5MB.';
        } else if (error.message.includes('Network Error') || error.message.includes('failed to fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          // Use the actual error message but keep it concise
          errorMessage = error.message.length > 100 
            ? error.message.substring(0, 100) + '...' 
            : error.message;
        }
      }
      
      // Show the error message to the user
      toast.error(errorMessage, {
        duration: 5000, // Show for longer
        style: {
          maxWidth: '500px', // Allow more space for error details
        }
      });
      
      // Clear the field value in event state
      onEventChange({
        ...event,
        [field]: undefined
      });
    } finally {
      // Reset loading state
      setIsUploading(prev => ({ ...prev, [field]: false }));
      // Clear the global upload flag AFTER the upload finishes (success or fail)
      if (typeof window !== 'undefined') {
        // Check if *any* upload is still in progress before clearing
        const stillUploading = Object.values({...isUploading, [field]: false}).some(Boolean);
        if (!stillUploading) {
          (window as any).__IS_UPLOADING_FILE__ = false;
          console.log(`Upload finished for ${field} - cleared __IS_UPLOADING_FILE__ flag`);
        } else {
          console.log(`Upload finished for ${field} - other uploads still in progress`);
        }
      }
    }
  };

  const handleImageRemove = (field: 'coverImage' | 'logo') => {
    // Remove the image from state
    const updatedEvent = {
      ...event,
      [field]: undefined
    };
    
    console.log(`Removing ${field}`);
    
    // Clear any errors for this field
    clearErrors(field);
    
    // Update the form state
    onEventChange(updatedEvent);
    
    // Show a success message
    toast.success(`${field === 'coverImage' ? 'Cover image' : 'Logo'} removed`);
    setHasChanges(true); // Mark change on removal
  };
  
  // Open Pexels image selector for a specific field
  const handleOpenPexelsSelector = (field: 'coverImage' | 'logo') => {
    setShowPexelsSelector({
      isOpen: true,
      field: field
    });
  };
  
  // Handle image selection from Pexels selector
  const handlePexelsImageSelected = async (photo: PexelsPhoto) => {
    const fieldToUpdate = showPexelsSelector.field;
    if (!fieldToUpdate) return;

    setShowPexelsSelector({ isOpen: false, field: null });
    const toastId = `pexels-process-${fieldToUpdate}-${photo.id}`;
    toast.loading(`Processing ${photo.alt || 'selected image'} from Pexels...`, { id: toastId });

    try {
      const imageUrlToDownload = photo.src.original;
      const fileName = `pexels-${photo.id}-${fieldToUpdate}.jpg`;
      const file = await downloadImageAsFile(imageUrlToDownload, fileName);
      
      if (!file) {
        throw new Error('Failed to download image from Pexels.');
      }
      
      const folder = fieldToUpdate === 'coverImage' ? CloudinaryFolder.EVENT_IMAGES : CloudinaryFolder.EVENT_LOGOS;
      
      const pexelsAttribution = {
        name: photo.photographer,
        url: photo.photographer_url,
        source: "Pexels",
        sourceUrl: photo.url,
      };
      
      // Call handleImageSelected once, passing the file, folder, and attribution
      await handleImageSelected(file, fieldToUpdate, folder, pexelsAttribution);
      
      // No second onEventChange needed here as handleImageSelected now handles attribution.
      setHasChanges(true); // Mark changes (handleImageSelected will also call this, but good to be explicit)

      toast.success(
        <div>
          <p>{fieldToUpdate === 'coverImage' ? 'Cover image' : 'Logo'} set from Pexels</p>
          <p className="text-xs text-gray-400">Photo by {photo.photographer}</p>
        </div>,
        { id: toastId }
      );

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process Pexels image", { id: toastId });
      console.error("Error processing Pexels image:", error);
    }
  };

  // Determine errors for coverImage and logo
  const coverImageError = formErrors['coverImage'];
  const logoError = formErrors['logo'];

  // Log the preview URL being passed to ImageUpload for cover image
  if (event.coverImage) {
    console.log('[ImagesForm] Cover Image Preview URL for ImageUpload:', event.coverImage.url);
    console.log('[ImagesForm] Cover Image File Object:', event.coverImage.file);
  }

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
        Event Images
      </h3>

      <div className="space-y-4">
        <label className="block text-gray-300 mb-2">
          Cover Image <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <ImageUpload
            label="Event Cover Image"
            folder={CloudinaryFolder.EVENT_IMAGES}
            onImageSelected={(file) => handleImageSelected(file, 'coverImage', CloudinaryFolder.EVENT_IMAGES)}
            onImageRemove={() => handleImageRemove('coverImage')}
            previewUrl={event.coverImage?.url}
            error={coverImageError}
            uploading={isUploading.coverImage}
            description="Recommended: 1200×675px (16:9) landscape format"
          />
          
          <button
            type="button"
            onClick={() => handleOpenPexelsSelector('coverImage')}
            disabled={isUploading.coverImage || isUploading.logo}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
          >
            {isUploading.coverImage ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span className="animate-pulse">Processing...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                Find Professional Image
              </>
            )}
          </button>
          
          {event.coverImage?.attribution && (
            <div className="text-xs text-gray-400 mt-1 transition-opacity duration-300 hover:text-gray-300">
              Photo by{' '}
              <a
                href={event.coverImage.attribution.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline hover:text-purple-300 transition-colors"
              >
                {event.coverImage.attribution.name}
              </a>{' '}
              on{' '}
              <a
                href={event.coverImage.attribution.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline hover:text-purple-300 transition-colors"
              >
                {event.coverImage.attribution.source}
              </a>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        <label className="block text-gray-300 mb-2">
          Logo (optional)
        </label>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <ImageUpload
            label="Event Logo"
            folder={CloudinaryFolder.EVENT_LOGOS}
            onImageSelected={(file) => handleImageSelected(file, 'logo', CloudinaryFolder.EVENT_LOGOS)}
            onImageRemove={() => handleImageRemove('logo')}
            previewUrl={event.logo?.url}
            error={logoError}
            uploading={isUploading.logo}
            description="Recommended: square format with transparent background"
          />
          
          <button
            type="button"
            onClick={() => handleOpenPexelsSelector('logo')}
            disabled={isUploading.coverImage || isUploading.logo}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
          >
            {isUploading.logo ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span className="animate-pulse">Processing...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                Find Professional Image
              </>
            )}
          </button>
          
          {event.logo?.attribution && (
            <div className="text-xs text-gray-400 mt-1 transition-opacity duration-300 hover:text-gray-300">
              Photo by{' '}
              <a
                href={event.logo.attribution.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline hover:text-purple-300 transition-colors"
              >
                {event.logo.attribution.name}
              </a>{' '}
              on{' '}
              <a
                href={event.logo.attribution.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline hover:text-purple-300 transition-colors"
              >
                {event.logo.attribution.source}
              </a>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 bg-gray-800 bg-opacity-50 p-4 rounded-lg border border-gray-700 transition-all duration-300 hover:bg-opacity-60">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Image Tips:</h3>
        <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
          <li>Cover image should be landscape format (16:9 ratio recommended)</li>
          <li>Logo should preferably have a transparent background</li>
          <li>Use high-quality images that represent your event professionally</li>
          <li>Avoid text-heavy images as they may not display well on all devices</li>
          <li>Use the "Find Professional Image" button to select from Pexels stock photos</li>
        </ul>
      </div>
      
      {/* Pexels Image Selector Modal */}
      {showPexelsSelector.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto transition-opacity duration-300 opacity-100">
          <PexelsImageSelector
            onImageSelected={handlePexelsImageSelected}
            onClose={() => setShowPexelsSelector({ isOpen: false, field: null })}
            initialCategory={showPexelsSelector.field === 'logo' ? 'logo' : 'event'}
          />
        </div>
      )}
    </div>
  );
};

export default ImagesForm; 