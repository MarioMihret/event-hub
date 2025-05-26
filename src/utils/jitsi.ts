

// Use the JaaS domain - App ID will be part of the URL path
const JITSI_DOMAIN = '8x8.vc'; 

/**
 * Generates a unique and stable meeting room name (slug) for an event.
 * Format: event-{eventId}-{timestamp}
 */
export const generateJitsiRoomName = (eventId: string, timestamp?: number): string => {
  if (!eventId) {
    console.error("Cannot generate Jitsi room name without eventId");
    // Fallback to a generic random name if eventId is somehow missing, though this should be prevented.
    const randomStr = Math.random().toString(36).substring(2, 12);
    const nowTimestamp = Date.now().toString(36).slice(-6);
    return `event-unknown-${randomStr}-${nowTimestamp}`.replace(/[^a-zA-Z0-9-]/g, '-');
  }
  const ts = timestamp || Date.now();
  // Using the full timestamp for more uniqueness if multiple rooms were somehow generated for the same event rapidly.
  // Alternatively, a fixed identifier derived from event creation could be used if the timestamp should be static once set.
  return `event-${eventId}-${ts}`.replace(/[^a-zA-Z0-9-]/g, '-'); // Ensure URL safe
};

/**
 * Creates a basic JaaS meeting URL (JWT must be appended by the component)
 * Example: https://8x8.vc/appid-tenant/room-name
 */
export const createJaaSMeetingUrl = (appId: string, roomName: string): string => {
  if (!appId || !roomName) {
    console.error("Cannot create JaaS URL without App ID and Room Name");
    // Return a non-functional placeholder or throw error
    return `https://${JITSI_DOMAIN}/error-missing-params`; 
  }
  // Ensure room name is URL safe
  const sanitizedRoom = roomName.replace(/[^a-zA-Z0-9-]/g, '-');
  return `https://${JITSI_DOMAIN}/${appId}/${sanitizedRoom}`;
};

/**
 * Loads the Jitsi Meet External API script (domain is now hardcoded for JaaS)
 */
export const getJitsiIframeApi = () => {
  return new Promise<any>((resolve, reject) => {
    const externalApiUrl = `https://${JITSI_DOMAIN}/external_api.js`;
    try {
      if ((window as any).JitsiMeetExternalAPI) {
        resolve((window as any).JitsiMeetExternalAPI);
        return;
      }

      const script = document.createElement('script');
      script.src = externalApiUrl;
      script.async = true;
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout loading Jitsi API'));
      }, 10000); // 10 seconds timeout
      
      script.onload = () => {
        clearTimeout(timeoutId);
        if ((window as any).JitsiMeetExternalAPI) {
          resolve((window as any).JitsiMeetExternalAPI);
        } else {
          reject(new Error('Jitsi API not found after loading script'));
        }
      };
      
      script.onerror = (error) => {
        clearTimeout(timeoutId);
        console.error('Failed to load Jitsi API script:', error);
        reject(error);
      };
      
      document.body.appendChild(script);
    } catch (error) {
      console.error('Error in getJitsiIframeApi:', error);
      reject(error);
    }
  });
}; 