export const AUTH_STORAGE_KEY = 'auth_session';
export const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export const MONGODB = {
  dbName: 'event',
  collections: {
    users: 'user',
    profiles: 'profile',
    events: 'events',
    organizers: 'organizers',
    organizerApplications: 'organizer_applications',
    loginAttempts: 'login_attempts',
    subscriptions: 'subscriptions',
    rateLimits: 'rate_limits'
  }
} as const;