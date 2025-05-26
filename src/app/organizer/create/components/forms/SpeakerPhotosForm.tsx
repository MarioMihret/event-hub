"use client";

import React, { useState } from 'react';
import { CloudinaryFolder } from '@/utils/cloudinary';
import ImageUpload from '@/components/ImageUpload';
import { SpeakerPhotosFormProps } from '../../types';
import { Plus, Trash2, User, Image as ImageIcon, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { uploadFile } from '@/utils/fileUpload';
import { v4 as uuidv4 } from 'uuid';
import { PexelsPhoto, downloadImageAsFile } from '@/utils/pexelsApi';
import PexelsImageSelector from '@/components/PexelsImageSelector';

interface Speaker {
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
}

const defaultSpeaker: Speaker = {
  id: '',
  name: '',
  role: '',
  bio: '',
  photo: undefined
};

const SpeakerPhotosForm: React.FC<SpeakerPhotosFormProps> = ({
  event,
  onEventChange,
  formErrors,
  clearErrors,
  setHasChanges
}) => {
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [showPexelsSelector, setShowPexelsSelector] = useState<{
    isOpen: boolean;
    speakerId: string | null;
  }>({
    isOpen: false,
    speakerId: null
  });
  
  const speakers = event.speakers || [];

  const handleAddSpeaker = () => {
    const newSpeaker = { ...defaultSpeaker, id: uuidv4() };
    onEventChange({
      ...event,
      speakers: [...speakers, newSpeaker]
    });
    setHasChanges(true);
  };

  const handleRemoveSpeaker = (id: string) => {
    onEventChange({
      ...event,
      speakers: speakers.filter(s => s.id !== id)
    });
    setHasChanges(true);
    toast.success('Speaker removed');
  };

  const handleSpeakerChange = (id: string, field: keyof Speaker, value: string) => {
    onEventChange({
      ...event,
      speakers: speakers.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      )
    });
    setHasChanges(true);
  };

  const handlePhotoSelected = async (file: File, speakerId: string) => {
    if (typeof window !== 'undefined') {
      (window as any).__IS_UPLOADING_FILE__ = true;
    }
    try {
      setIsUploading(prev => ({ ...prev, [speakerId]: true }));
      
      console.log(`Uploading photo for speaker ${speakerId}:`, file.name);
      
      let attempts = 0;
      const maxAttempts = 3;
      let uploadResult = null;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          uploadResult = await uploadFile(file, CloudinaryFolder.SPEAKER_PHOTOS);
          
          break;
        } catch (error) {
          lastError = error;
          attempts++;
          
          console.error(`Upload attempt ${attempts} failed:`, error);
          
          if (attempts < maxAttempts) {
            const retryDelay = Math.pow(2, attempts) * 1000;
            console.log(`Retrying upload in ${retryDelay}ms...`);
            
            toast.loading(`Retrying upload... (attempt ${attempts + 1}/${maxAttempts})`, 
              { id: `upload-retry-${speakerId}`, duration: retryDelay }
            );
            
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      
      if (!uploadResult) {
        throw lastError || new Error('Failed to upload after multiple attempts');
      }
      
      console.log('Upload successful:', uploadResult);
      
      if (uploadResult && uploadResult.secure_url) {
        onEventChange({
          ...event,
          speakers: speakers.map(s => 
            s.id === speakerId 
              ? { 
                  ...s, 
                  photo: {
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                    width: uploadResult.width,
                    height: uploadResult.height,
                    file: file,
                    ...(uploadResult.attribution && { attribution: uploadResult.attribution })
                  } 
                } 
              : s
          )
        });
        
        const speakerIndex = speakers.findIndex(s => s.id === speakerId);
        if (speakerIndex !== -1) {
          clearErrors(`speakers.${speakerIndex}.photo`);
        }

        setHasChanges(true);
        toast.success('Speaker photo uploaded');
      }
    } catch (error) {
      console.error('Error uploading speaker photo:', error);
      
      let errorMessage = 'Failed to upload image';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('Timeout')) {
          errorMessage = 'Upload timed out. Please try with a smaller image or check your connection.';
        } else if (error.message.includes('failed with status: 413')) {
          errorMessage = 'Image is too large. Please use an image under 5MB.';
        } else if (error.message.includes('Network Error') || error.message.includes('failed to fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message.length > 100 
            ? error.message.substring(0, 100) + '...' 
            : error.message;
        }
      }
      
      toast.error(errorMessage, {
        duration: 5000,
        style: {
          maxWidth: '500px'
        }
      });
    } finally {
      setIsUploading(prev => ({ ...prev, [speakerId]: false }));
      
      const stillUploading = Object.values({...isUploading, [speakerId]: false}).some(Boolean);
      if (!stillUploading && typeof window !== 'undefined') {
        (window as any).__IS_UPLOADING_FILE__ = false;
        console.log(`Upload finished for speaker ${speakerId} - cleared __IS_UPLOADING_FILE__ flag`);
      }
    }
  };

  const handlePhotoRemove = (speakerId: string) => {
    onEventChange({
      ...event,
      speakers: speakers.map(s => 
        s.id === speakerId ? { ...s, photo: undefined } : s
      )
    });
    setHasChanges(true);
    const speakerIndex = speakers.findIndex(s => s.id === speakerId);
    if (speakerIndex !== -1) {
       clearErrors(`speakers.${speakerIndex}.photo`);
    }
    toast.success('Speaker photo removed');
  };
  
  const handleOpenPexelsSelector = (speakerId: string) => {
    setShowPexelsSelector({
      isOpen: true,
      speakerId: speakerId
    });
  };
  
  const speakersArrayError = formErrors['speakers'];

  const handlePexelsImageSelected = async (photo: PexelsPhoto) => {
    const speakerId = showPexelsSelector.speakerId;
    
    if (!speakerId) {
      setShowPexelsSelector({ isOpen: false, speakerId: null });
      return;
    }
    
    if (typeof window !== 'undefined') {
      (window as any).__IS_UPLOADING_FILE__ = true;
    }

    try {
      setShowPexelsSelector({ isOpen: false, speakerId: null });
      
      setIsUploading(prev => ({ ...prev, [speakerId]: true }));
      
      const imageUrl = photo.src.portrait || photo.src.medium;
      const fileName = `pexels-${photo.id}.jpg`;
      
      toast.loading(`Downloading image from Pexels...`, { id: 'pexels-download' });
      
      try {
        const imageFile = await downloadImageAsFile(imageUrl, fileName);
        
        toast.success(`Image downloaded successfully`, { id: 'pexels-download' });
        
        clearErrors(`speaker_${speakerId}_photo`);
        
        let attempts = 0;
        const maxAttempts = 3;
        let uploadResult = null;
        let lastError = null;
        
        while (attempts < maxAttempts) {
          try {
            toast.loading(`Uploading image... (attempt ${attempts + 1}/${maxAttempts})`, 
              { id: 'pexels-upload' }
            );
            
            uploadResult = await uploadFile(imageFile, CloudinaryFolder.SPEAKER_PHOTOS, {
              attribution: {
                name: photo.photographer,
                url: photo.photographer_url,
                source: 'Pexels',
                sourceUrl: photo.url
              }
            });
            
            toast.success(`Upload successful!`, { id: 'pexels-upload' });
            break;
          } catch (error) {
            lastError = error;
            attempts++;
            
            console.error(`Pexels upload attempt ${attempts} failed:`, error);
            
            if (attempts < maxAttempts) {
              const retryDelay = Math.pow(2, attempts) * 1000;
              console.log(`Retrying Pexels upload in ${retryDelay}ms...`);
              
              toast.loading(`Retrying upload... (attempt ${attempts + 1}/${maxAttempts})`, 
                { id: 'pexels-upload', duration: retryDelay }
              );
              
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
              toast.error(`Upload failed after ${maxAttempts} attempts`, { id: 'pexels-upload' });
            }
          }
        }
        
        if (!uploadResult) {
          throw lastError || new Error('Failed to upload Pexels image after multiple attempts');
        }
        
        if (uploadResult && uploadResult.secure_url) {
          onEventChange({
            ...event,
            speakers: speakers.map(s => 
              s.id === speakerId 
                ? { 
                    ...s, 
                    photo: {
                      url: uploadResult.secure_url,
                      publicId: uploadResult.public_id,
                      width: uploadResult.width,
                      height: uploadResult.height,
                      file: imageFile,
                      attribution: {
                        name: photo.photographer,
                        url: photo.photographer_url,
                        source: 'Pexels',
                        sourceUrl: photo.url
                      }
                    } 
                  } 
                : s
            )
          });
          
          setHasChanges(true);
          toast.success(
            <div>
              <p>Speaker photo set from Pexels</p>
              <p className="text-xs text-gray-400">Photo by {photo.photographer}</p>
            </div>
          );
        }
      } catch (downloadError) {
        console.error('Error downloading image from Pexels:', downloadError);
        toast.error('Failed to download image from Pexels. Please try another image.', { id: 'pexels-download' });
        throw downloadError;
      }
    } catch (error) {
      console.error('Error processing Pexels image:', error);
      
      let errorMessage = 'Failed to process the selected image';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('Timeout')) {
          errorMessage = 'Upload timed out. The Pexels image may be too large or your connection is slow.';
        } else if (error.message.includes('Network Error') || error.message.includes('failed to fetch')) {
          errorMessage = 'Network error when processing the Pexels image. Please check your connection.';
        } else {
          errorMessage = error.message.length > 100 
            ? error.message.substring(0, 100) + '...' 
            : error.message;
        }
      }
      
      toast.error(errorMessage, {
        duration: 5000,
        style: {
          maxWidth: '500px',
        }
      });
    } finally {
      setIsUploading(prev => ({ ...prev, [speakerId]: false }));
      
      const stillUploading = Object.values({...isUploading, [speakerId]: false}).some(Boolean);
      if (!stillUploading && typeof window !== 'undefined') {
        (window as any).__IS_UPLOADING_FILE__ = false;
        console.log(`Pexels upload finished for speaker ${speakerId} - cleared __IS_UPLOADING_FILE__ flag`);
      }
    }
  };

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">
        Event Speakers
      </h3>
      <p className="text-gray-400">
        Add information about the speakers or presenters for your event.
      </p>

      {speakersArrayError && (
        <div className="p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-md text-sm mb-4">
          {speakersArrayError}
        </div>
      )}

      {speakers.map((speaker, index) => {
        const nameError = formErrors[`speakers.${index}.name`];
        const bioError = formErrors[`speakers.${index}.bio`];
        
        return (
          <div key={speaker.id} className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700 relative space-y-4">
            <button
              type="button"
              onClick={() => handleRemoveSpeaker(speaker.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-2">
                <ImageUpload
                  label="Speaker Photo"
                  folder={CloudinaryFolder.SPEAKER_PHOTOS}
                  onImageSelected={(file) => handlePhotoSelected(file, speaker.id)}
                  onImageRemove={() => handlePhotoRemove(speaker.id)}
                  previewUrl={speaker.photo?.url}
                  error={formErrors[`speakers.${index}.photo`]}
                  uploading={isUploading[speaker.id] || false}
                  description="Recommended: square or portrait format"
                />
                
                <button
                  type="button"
                  onClick={() => handleOpenPexelsSelector(speaker.id)}
                  disabled={isUploading[speaker.id] || false}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading[speaker.id] ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      Find Professional Photo
                    </>
                  )}
                </button>
                
                {speaker.photo?.attribution && (
                  <div className="text-xs text-gray-400 mt-1">
                    Photo by{' '}
                    <a
                      href={speaker.photo.attribution.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:underline"
                    >
                      {speaker.photo.attribution.name}
                    </a>{' '}
                    on{' '}
                    <a
                      href={speaker.photo.attribution.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:underline"
                    >
                      {speaker.photo.attribution.source}
                    </a>
                  </div>
                )}
              </div>
              
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label htmlFor={`speaker-name-${speaker.id}`} className="block text-sm font-medium text-gray-300 mb-1">
                    Speaker Name *
                  </label>
                  <input
                    type="text"
                    id={`speaker-name-${speaker.id}`}
                    value={speaker.name}
                    onChange={(e) => handleSpeakerChange(speaker.id, 'name', e.target.value)}
                    placeholder="e.g., Jane Doe"
                    required
                    className={`w-full px-4 py-2 bg-gray-700 border ${nameError ? 'border-red-500' : 'border-gray-600'} rounded-md text-white focus:ring-purple-500 focus:border-purple-500 shadow-sm transition duration-150 ease-in-out`}
                  />
                  {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Role/Title</label>
                  <input
                    value={speaker.role}
                    onChange={(e) => handleSpeakerChange(speaker.id, 'role', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="e.g. CEO, Speaker, Expert"
                  />
                </div>
                
                <div>
                  <label htmlFor={`speaker-bio-${speaker.id}`} className="block text-sm font-medium text-gray-300 mb-1">
                    Speaker Bio (Optional)
                  </label>
                  <textarea
                    id={`speaker-bio-${speaker.id}`}
                    value={speaker.bio}
                    onChange={(e) => handleSpeakerChange(speaker.id, 'bio', e.target.value)}
                    rows={3}
                    placeholder="Brief background or expertise..."
                    className={`w-full px-4 py-2 bg-gray-700 border ${bioError ? 'border-red-500' : 'border-gray-600'} rounded-md text-white focus:ring-purple-500 focus:border-purple-500 shadow-sm transition duration-150 ease-in-out`}
                  />
                  {bioError && <p className="mt-1 text-xs text-red-400">{bioError}</p>}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex justify-start mt-6">
        <button
          type="button"
          onClick={handleAddSpeaker}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 transition duration-150 ease-in-out"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Add Speaker
        </button>
      </div>

      {showPexelsSelector.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <PexelsImageSelector
            onImageSelected={handlePexelsImageSelected}
            onClose={() => setShowPexelsSelector({ isOpen: false, speakerId: null })}
            initialCategory="portrait"
          />
        </div>
      )}
    </div>
  );
};

export default SpeakerPhotosForm; 