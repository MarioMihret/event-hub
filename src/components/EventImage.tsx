"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import type { Event, ImageAttribution } from "@/types/event";

// Use a local placeholder image from the public directory
const DEFAULT_EVENT_IMAGE = "/images/event-placeholder.jpg";

interface EventImageProps {
  event: Event;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  showAttribution?: boolean;
}

const EventImage: React.FC<EventImageProps> = ({
  event,
  alt,
  className = '',
  width,
  height,
  fill = false,
  sizes,
  priority = false,
  showAttribution = false
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Get the image source from the event
  const getImageSrc = () => {
    if (imageError) return DEFAULT_EVENT_IMAGE;
    
    // Check for cover image first - ensure we never return an empty string
    if (event?.coverImage?.url && event.coverImage.url.trim() !== '') {
      return event.coverImage.url;
    }
    
    // Fallback to legacy image property if it exists and is not an empty string
    if (event?.image && typeof event.image === 'string' && event.image.trim() !== '') {
      return event.image;
    }
    
    // Default placeholder
    return DEFAULT_EVENT_IMAGE;
  };

  // The src we'll use for the image - guaranteed to never be an empty string
  const imageSrc = getImageSrc();

  // Handle image load error
  const handleError = () => {
    setImageError(true);
  };

  // Check if we have attribution info
  const hasAttribution = !!(event.coverImage?.attribution);

  return (
    <div className={`relative ${className}`}>
      {fill ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          className={`object-cover ${className}`}
          onError={handleError}
          sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
          priority={priority}
        />
      ) : (
        <Image
          src={imageSrc}
          alt={alt}
          width={width || 800}
          height={height || 450}
          className={`object-cover ${className}`}
          onError={handleError}
          sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
          priority={priority}
        />
      )}
      
      {showAttribution && hasAttribution && !imageError && event.coverImage?.attribution && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 px-2 flex items-center justify-between">
          <span className="truncate">
            Photo by{' '}
            <a
              href={event.coverImage.attribution.link || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-300 hover:underline"
            >
              {event.coverImage.attribution.photographer || "Photographer"}
            </a>
          </span>
          
          {event.coverImage.attribution.source && (
            <a
              href={event.coverImage.attribution.link || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-300 hover:underline inline-flex items-center ml-2"
            >
              <span className="sr-only">View on {event.coverImage.attribution.source}</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default EventImage; 