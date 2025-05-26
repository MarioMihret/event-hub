// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
// import { formatDate } from "./utils/dateUtils"; // Removed as dateUtils.ts was deleted
import {
  getApplicationStatus,
  getApplicationId,
  getApplicationFeedback,
  clearApplicationData,
  canSubmitNewApplication
} from "./utils/applicationUtils";

// Export all utility functions from subdirectories
export { 
  // formatDate, // Removed as dateUtils.ts was deleted
  getApplicationStatus,
  getApplicationId,
  getApplicationFeedback,
  clearApplicationData,
  canSubmitNewApplication
};

// CSS class name utility for Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// TODO: Add more general utility functions here as needed.
// For example, string manipulation, number formatting, etc.