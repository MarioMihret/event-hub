/**
 * Format a date object to a human-readable string
 */
export function formatDate(date: Date): string {
  try {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toISOString().split('T')[0]; // Fallback to YYYY-MM-DD
  }
}

/**
 * Format a time value for display
 */
export function formatTime(date: Date): string {
  try {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return date.toTimeString().substring(0, 5); // Fallback to HH:MM
  }
}

/**
 * Calculate if a date is in the past
 */
export function isDateInPast(date: Date): boolean {
  const now = new Date();
  return date < now;
}

/**
 * Calculate if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

/**
 * Calculate if a date is tomorrow
 */
export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();
}

/**
 * Format a date range for display
 */
export function formatDateRange(startDate: Date, endDate?: Date): string {
  if (!endDate) {
    return formatDate(startDate);
  }
  
  // If same day
  if (startDate.getDate() === endDate.getDate() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getFullYear() === endDate.getFullYear()) {
    return `${formatDate(startDate)} from ${formatTime(startDate)} to ${formatTime(endDate)}`;
  }
  
  // Different days
  return `${formatDate(startDate)} to ${formatDate(endDate)}`;
} 