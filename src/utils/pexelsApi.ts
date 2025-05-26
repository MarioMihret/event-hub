import { toast } from 'react-hot-toast';

// Pexels API Key
const PEXELS_API_KEY = 'EiMBKL1p9Q4qUj8sHBzxVeJs2RnUpevtx5jMfS54TKLMPYExHMPpqeCD';
const PEXELS_API_URL = 'https://api.pexels.com/v1';

// Interface for Pexels photo
export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  liked: boolean;
  alt: string;
}

// Interface for Pexels API response
interface PexelsResponse {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  total_results: number;
  next_page: string;
  prev_page: string;
}

/**
 * Fetches random images from Pexels API based on a search query
 * @param query The search query for images
 * @param perPage Number of photos to fetch per page
 * @param page Page number to fetch
 * @returns Array of PexelsPhoto objects
 */
export const fetchPexelsImages = async (
  query: string,
  perPage: number = 10,
  page: number = 1
): Promise<PexelsPhoto[]> => {
  try {
    // Encode the query for URL
    const encodedQuery = encodeURIComponent(query);
    
    // Create the API URL with query parameters
    const url = `${PEXELS_API_URL}/search?query=${encodedQuery}&per_page=${perPage}&page=${page}`;
    
    // Fetch data from Pexels API
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    // Handle API errors
    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const data: PexelsResponse = await response.json();
    
    // Return the photos array
    return data.photos;
  } catch (error) {
    console.error('Error fetching images from Pexels:', error);
    toast.error('Failed to fetch images. Please try again later.');
    return [];
  }
};

/**
 * Fetches a photo by ID from Pexels API
 * @param id The ID of the photo to fetch
 * @returns PexelsPhoto object
 */
export const fetchPexelsPhotoById = async (id: number): Promise<PexelsPhoto | null> => {
  try {
    // Create the API URL
    const url = `${PEXELS_API_URL}/photos/${id}`;
    
    // Fetch data from Pexels API
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    // Handle API errors
    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const photo: PexelsPhoto = await response.json();
    
    return photo;
  } catch (error) {
    console.error('Error fetching photo from Pexels:', error);
    toast.error('Failed to fetch photo. Please try again later.');
    return null;
  }
};

/**
 * Fetches a random image URL from Pexels by category
 * @param category Category to search for
 * @returns URL of a random image
 */
export const fetchRandomImageByCategory = async (category: string): Promise<{
  url: string,
  photographer: string,
  photographerUrl: string,
  width: number,
  height: number,
  alt: string,
  sourceUrl: string
} | null> => {
  try {
    // Fetch images from Pexels
    const photos = await fetchPexelsImages(category);
    
    if (photos.length === 0) {
      throw new Error('No images found for this category');
    }
    
    // Select a random photo
    const randomIndex = Math.floor(Math.random() * photos.length);
    const randomPhoto = photos[randomIndex];
    
    // Return the image details
    return {
      url: randomPhoto.src.landscape, // Use landscape format for event cover images
      photographer: randomPhoto.photographer,
      photographerUrl: randomPhoto.photographer_url,
      width: randomPhoto.width,
      height: randomPhoto.height,
      alt: randomPhoto.alt || category,
      sourceUrl: randomPhoto.url
    };
  } catch (error) {
    console.error('Error fetching random image:', error);
    toast.error('Failed to fetch random image. Please try again later.');
    return null;
  }
};

/**
 * Download an image from a URL and convert it to a File object
 * @param url URL of the image to download
 * @param filename Name for the downloaded file
 * @returns File object
 */
export const downloadImageAsFile = async (url: string, filename: string): Promise<File> => {
  try {
    // Fetch the image
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    // Get the image blob
    const blob = await response.blob();
    
    // Create a File object from the blob
    const file = new File([blob], filename, { type: blob.type });
    
    return file;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}; 