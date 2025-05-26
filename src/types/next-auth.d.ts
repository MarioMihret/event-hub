import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";
import type { AppRole } from "@/types/auth"; // Import type from new location

declare module "next-auth" {
  /**
   * Returned by \`useSession\`, \`getSession\` and received as a prop on the \`SessionProvider\` React Context
   */
  interface Session {
    user: {
      id: string;
      isActive: boolean;
      role?: AppRole; // Use the defined AppRole type
      apiToken?: string; // Added from CustomSession/CustomJWT
      provider?: string; // Added from CustomSession
      // DefaultSession[\"user\"] provides name, email, image if you extend it
    } & DefaultSession["user"]; // Extends default session user properties (name, email, image)
    
    error?: string; // Optional: to propagate errors like "AccountSuspended"
    accessToken?: string; // Added from CustomSession
    expiresAt?: number; // Added from CustomSession (often managed by NextAuth, but can be custom)
  }

  /**
   * The shape of the user object returned in the OAuth providers\' \`profile\` callback,
   * or the \`user\` object returned by the \`authorize\` callback of the Credentials provider.
   */
  interface User extends DefaultUser {
    id: string; // DefaultUser already has id, but ensuring it for consistency
    isActive: boolean;
    role?: AppRole; // Use the defined AppRole type
    apiToken?: string; // If user object from authorize needs to carry this
    customImage?: string | null; // Add customImage property
    bio?: string | null; // Add bio property
    // name, email, image are part of DefaultUser
  }
}

declare module "next-auth/jwt" {
  /** Returned by the \`jwt\` callback and sent to the \`session\` callback */
  interface JWT extends DefaultJWT {
    id?: string; // Usually 'sub' is used, but if 'id' is explicitly set
    userId?: string; // From CustomJWT, can map to 'id' or 'sub'
    isActive?: boolean;
    role?: AppRole; // Use the defined AppRole type
    apiToken?: string; // Added from CustomJWT
    provider?: string; // Added from JWT callback logic
    error?: string; // Optional: for passing specific error states
    // name, email, picture are part of DefaultJWT
  }
}