import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { setSessionInCache, removeSessionFromCache } from '@/utils/sessionCache';

// Ensure the secret is retrieved from environment variables
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

if (!NEXTAUTH_SECRET) {
  // In development, a warning might be acceptable, but for safety, let's be strict.
  // For production, this MUST be an error.
  console.error("FATAL ERROR: NEXTAUTH_SECRET environment variable is not set.");
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET environment variable is not set. Application cannot start securely.");
  }
  // Fallback for non-production environments ONLY IF you absolutely need the app to run for dev purposes
  // and understand the risk. Best practice is to always have it set.
  // Consider removing this fallback entirely and just throwing the error.
  // For this exercise, we will throw to enforce best practice.
  throw new Error("NEXTAUTH_SECRET environment variable is not set. Please set it in your .env file.");
}

// Add event handlers to cache session data
const augmentedAuthOptions = {
  ...authOptions,
  secret: NEXTAUTH_SECRET, // Use the validated secret
  debug: false, // Explicitly disable debug mode
  events: {
    ...authOptions.events,
    signIn: async ({ user, account, isNewUser }) => {
      // Call existing event handlers if they exist
      if (authOptions.events?.signIn) {
        await authOptions.events.signIn({ user, account, isNewUser });
      }
      
      // Add user data to cache on sign in for faster access
      if (user && user.id) {
        setSessionInCache(`user_${user.id}`, user, 30 * 60 * 1000); // Cache for 30 minutes
      }
    },
    signOut: async ({ token, session }) => {
      // Call existing event handlers if they exist
      if (authOptions.events?.signOut) {
        await authOptions.events.signOut({ token, session });
      }
      
      // Clear user data from cache on sign out
      if (token?.sub) {
        removeSessionFromCache(`user_${token.sub}`);
      }
      
      // Clear session from cache
      if (session?.sessionToken) {
        removeSessionFromCache(`session_${session.sessionToken}`);
      }
    },
    session: async ({ session, token }) => {
      // Call existing event handlers if they exist
      if (authOptions.events?.session) {
        await authOptions.events.session({ session, token });
      }
      
      // Cache session data for faster access
      if (token?.sub && session) {
        setSessionInCache(`user_${token.sub}`, session.user, 10 * 60 * 1000); // Cache for 10 minutes
        
        if (session.sessionToken) {
          setSessionInCache(`session_${session.sessionToken}`, session, 10 * 60 * 1000);
        }
      }
    }
  }
};

const handler = NextAuth(augmentedAuthOptions);

export { handler as GET, handler as POST };