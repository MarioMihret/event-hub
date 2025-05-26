"use client";

import React, { useState, useRef, useCallback } from 'react';
import { CloudinaryFolder } from '@/utils/cloudinary';
import { Loader, Upload, X, RefreshCw, ImageIcon } from 'lucide-react';
import { validateFile } from '@/utils/fileUpload';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface ImageUploadProps {
  label: string;
  folder: CloudinaryFolder;
  onImageSelected: (file: File) => void;
  onImageRemove: () => void;
  previewUrl?: string;
  error?: string;
  uploading?: boolean;
  description?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  folder,
  onImageSelected,
  onImageRemove,
  previewUrl,
  error,
  uploading = false,
  description
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = useCallback(
    (file: File) => {
      // Reset previous errors
      setValidationError(null);
      setImageError(false);
      setRetryCount(0);

      // Validate file
      const validation = validateFile(file, 5, [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/webp',
        'image/gif'
      ]);

      if (!validation.valid) {
        setValidationError(validation.error || 'Invalid file');
        return;
      }

      // Pass the file to parent component
      onImageSelected(file);
    },
    [onImageSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        processFile(file);
        // Reset file input so same file can be selected again
        e.target.value = '';
      }
    },
    [processFile]
  );

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleRetryImage = useCallback(() => {
    if (retryCount < 3) {
      setImageError(false);
      setRetryCount(prev => prev + 1);
    }
  }, [retryCount]);

  // Use the local placeholder as fallback if the main image fails to load
  const placeholderImage = '/images/placeholder-image.jpg';
  const imageSource = imageError ? placeholderImage : (previewUrl || placeholderImage);

  return (
    <div className="flex flex-col">
      <label className="block text-gray-300 mb-2">{label}</label>
      
      {!previewUrl ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors
            ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-gray-500'}
            ${error || validationError ? 'border-red-500 bg-red-500/10' : ''}
            ${uploading ? 'pointer-events-none' : ''}
          `}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
          
          {uploading ? (
            <div className="flex flex-col items-center justify-center p-4">
              <Loader className="w-8 h-8 text-purple-500 animate-spin mb-2" />
              <p className="text-gray-300">
                Uploading...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-gray-300 text-center">
                Drag and drop an image here, or click to select
              </p>
              <p className="text-gray-500 text-sm mt-1 text-center">
                JPG, PNG, WebP or GIF • Max 5MB
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative border border-gray-600 rounded-lg overflow-hidden">
          <img
            src={imageSource}
            alt={label}
            className="w-full object-cover"
            style={{ maxHeight: '200px', position: 'relative', zIndex: 0 }}
            onError={handleImageError}
          />
          {imageError && retryCount < 3 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRetryImage();
              }}
              className="absolute top-2 left-2 p-1 bg-gray-900/80 hover:bg-blue-600 rounded-full text-white transition-colors"
              aria-label="Retry loading image"
              title="Retry loading image"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onImageRemove();
              setImageError(false);
              setRetryCount(0);
            }}
            className="absolute top-2 right-2 p-1 bg-gray-900/80 hover:bg-red-600 rounded-full text-white transition-colors z-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            aria-label="Remove image"
            title="Remove image"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {(error || validationError) && (
        <p className="mt-1 text-sm text-red-500">{error || validationError}</p>
      )}
      
      {description && !error && !validationError && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}
    </div>
  );
};

export default ImageUpload; 