// src/lib/utils/applicationUtils.ts

// Define constants for localStorage keys
const LOCAL_STORAGE_KEYS = {
  STATUS: "applicationStatus",
  ID: "applicationId",
  FEEDBACK: "applicationFeedback",
  DATA: "organizer_application",
} as const;

// Application status management
export function getApplicationStatus() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LOCAL_STORAGE_KEYS.STATUS);
}

export function getApplicationId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LOCAL_STORAGE_KEYS.ID);
}

export function getApplicationFeedback() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LOCAL_STORAGE_KEYS.FEEDBACK);
}

export function getApplicationData() {
  if (typeof window === 'undefined') return null;
  try {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEYS.DATA);
    return storedData ? JSON.parse(storedData) : null;
  } catch (err) {
    console.error('Error parsing application data:', err);
    return null;
  }
}

export function clearApplicationData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_STORAGE_KEYS.STATUS);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ID);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.FEEDBACK);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.DATA);
}

export function canSubmitNewApplication() {
  const status = getApplicationStatus();
  // User can submit a new application if they have no previous application
  // or if their previous application was rejected
  return !status || status === "rejected";
} 