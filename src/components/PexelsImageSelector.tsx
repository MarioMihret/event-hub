import React, { useState, useEffect } from 'react';
import { XCircle, Search, Loader, RefreshCw, ExternalLink } from 'lucide-react';
import { fetchPexelsImages, PexelsPhoto } from '@/utils/pexelsApi';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

const IMAGE_CATEGORIES = [
  'event',
  'conference',
  'seminar', 
  'workshop',
  'concert',
  'business meeting',
  'party',
  'celebration',
  'convention',
  'team building',
  'networking',
  'webinar',
  'exhibition',
  'festival',
  'ceremony',
  'class',
  'training',
  'presentation'
];

interface PexelsImageSelectorProps {
  onImageSelected: (photo: PexelsPhoto) => void;
  onClose: () => void;
  initialCategory?: string;
}

const PexelsImageSelector: React.FC<PexelsImageSelectorProps> = ({
  onImageSelected,
  onClose,
  initialCategory = 'event'
}) => {
  const [searchTerm, setSearchTerm] = useState(initialCategory);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [images, setImages] = useState<PexelsPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<PexelsPhoto | null>(null);

  // Fetch images when the component mounts or when the category changes
  useEffect(() => {
    fetchImages(selectedCategory);
  }, [selectedCategory]);

  // Function to fetch images from Pexels
  const fetchImages = async (query: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const photos = await fetchPexelsImages(query);
      setImages(photos);
      
      if (photos.length === 0) {
        setError('No images found for this category. Try another search term.');
      }
    } catch (err) {
      setError('Failed to fetch images. Please try again.');
      console.error('Error fetching Pexels images:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search form submission
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchTerm.trim()) {
      setSelectedCategory(searchTerm.trim());
      fetchImages(searchTerm.trim());
    }
  };

  // Handle category selection
  const handleCategoryClick = (category: string) => {
    setSearchTerm(category);
    setSelectedCategory(category);
  };

  // Handle image selection
  const handleImageClick = (photo: PexelsPhoto) => {
    setSelectedImage(photo);
  };

  // Confirm image selection
  const handleConfirmSelection = () => {
    if (selectedImage) {
      onImageSelected(selectedImage);
    }
  };

  // Handle random image selection
  const handleRandomImage = async () => {
    if (images.length > 0) {
      const randomIndex = Math.floor(Math.random() * images.length);
      setSelectedImage(images[randomIndex]);
      toast.success('Random image selected!');
    } else {
      toast.error('No images available to select randomly.');
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] h-auto overflow-hidden flex flex-col mx-auto my-auto">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg sm:text-xl font-semibold text-white">Select Image from Pexels</h2>
        <button 
          className="text-gray-400 hover:text-gray-200 transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Search and categories */}
      <div className="p-3 sm:p-4 border-b border-gray-700 bg-gray-900">
        <div className="flex mb-3 sm:mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-l-lg p-2 text-white focus:border-purple-500 focus:outline-none text-sm sm:text-base"
            placeholder="Search for images..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <button
            onClick={handleSearch}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 rounded-r-lg flex items-center justify-center"
            disabled={loading}
          >
            {loading ? <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Search className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-24 overflow-y-auto pb-1">
          {IMAGE_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`text-xs px-2 sm:px-3 py-1 rounded-full transition-colors mb-1 ${
                selectedCategory === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Image grid - Horizontal scroll view */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4">
        {loading ? (
          <div className="w-full flex items-center justify-center p-4 sm:p-8">
            <Loader className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 animate-spin" />
            <span className="ml-3 text-gray-300 text-sm sm:text-base">Loading images...</span>
          </div>
        ) : error ? (
          <div className="w-full text-center p-4 sm:p-8">
            <p className="text-red-400 mb-3 sm:mb-4 text-sm sm:text-base">{error}</p>
            <button
              onClick={() => fetchImages(selectedCategory)}
              className="inline-flex items-center bg-gray-700 hover:bg-gray-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Retry
            </button>
          </div>
        ) : images.length === 0 ? (
          <div className="w-full text-center p-4 sm:p-8">
            <p className="text-gray-400 text-sm sm:text-base">No images found. Try a different search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex flex-nowrap gap-3 sm:gap-4 pb-1">
              {images.map((photo) => (
                <div
                  key={photo.id}
                  className={`relative rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                    selectedImage?.id === photo.id
                      ? 'border-purple-500 scale-95'
                      : 'border-transparent hover:border-gray-500'
                  }`}
                  style={{ 
                    width: '280px',
                    height: '210px'
                  }}
                  onClick={() => handleImageClick(photo)}
                >
                  <img
                    src={photo.src.medium}
                    alt={photo.alt || 'Pexels image'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {selectedImage?.id === photo.id && (
                    <div className="absolute inset-0 bg-purple-500 bg-opacity-20 flex items-center justify-center">
                      <div className="bg-purple-600 rounded-full p-1.5 sm:p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1.5 sm:p-2 truncate">
                    Photo by {photo.photographer}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add CSS to hide scrollbar but maintain functionality */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Footer / actions */}
      <div className="p-3 sm:p-4 border-t border-gray-700 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 justify-between items-center">
        <div className="text-xs text-gray-400 w-full sm:w-auto text-center sm:text-left mb-2 sm:mb-0">
          <a 
            href="https://www.pexels.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center sm:justify-start hover:text-purple-400 transition-colors"
          >
            Photos provided by Pexels <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
        
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end">
          <button
            onClick={handleRandomImage}
            disabled={loading || images.length === 0}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Random
          </button>
          
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
          
          <button
            onClick={handleConfirmSelection}
            disabled={!selectedImage}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Select Image
          </button>
        </div>
      </div>
    </div>
  );
};

export default PexelsImageSelector; 