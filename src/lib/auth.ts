import { NextAuthOptions, User as NextAuthUser } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { clientPromise } from "@/lib/mongodb";
import { MongoClient, UpdateFilter } from "mongodb";
import {
  UserDocument,
  LoginHistoryEntry,
  LoginAttemptDocument
} from "@/types/auth";
import { MONGODB } from "@/constants/auth";
import NextAuth, { 
  Session, 
  AuthOptions,
  User
} from "next-auth";
import { JWT } from "next-auth/jwt";
import { AppRole } from "@/types/auth";
import { SESSION_DURATION } from "@/constants/auth";

// Ensure the secret is accessible
const getSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("FATAL ERROR: NEXTAUTH_SECRET environment variable is not set.");
    throw new Error("NEXTAUTH_SECRET environment variable is not set. Application cannot start securely.");
  }
  return secret;
};

export const authOptions: NextAuthOptions = {
  secret: getSecret(),
  debug: false,
  session: {
    strategy: "jwt",
    maxAge: SESSION_DURATION / 1000, // 12 hours in seconds
    updateAge: 24 * 60 * 60, // 24 hours - Session will be updated if older than this (but within maxAge)
                           // For strict 12h expiry, updateAge doesn't extend it beyond original maxAge.
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? `__Secure-user-app.session-token`
        : `user-app.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_DURATION / 1000 // 12 hours in seconds for the cookie
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? `__Secure-user-app.callback-url`
        : `user-app.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
        // No maxAge specified, typically session-lived or matches sessionToken if framework aligns
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? `__Host-user-app.csrf-token`
        : `user-app.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
        // No maxAge specified, typically session-lived
      }
    }
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline", // Optional: Request refresh token if needed
          response_type: "code"
        }
      },
      async profile(profile) {
        try {
          const client: MongoClient = await clientPromise;
          const db = client.db(MONGODB.dbName);
          const userCollection = db.collection<UserDocument>(MONGODB.collections.users);

          const loginHistoryEntry: LoginHistoryEntry = {
            timestamp: new Date(),
            provider: 'google',
            success: true,
            ip: null
          };

          const existingUser = await userCollection.findOne({
            email: profile.email,
          });

          if (!existingUser) {
            const newUser: Partial<UserDocument> = {
              name: profile.name,
              email: profile.email,
              image: profile.picture || null,
              createdAt: new Date(),
              lastLogin: new Date(),
              loginHistory: [loginHistoryEntry]
            };

            await userCollection.insertOne(newUser as UserDocument);
          } else {
            const update: UpdateFilter<UserDocument> = {
              $push: { loginHistory: loginHistoryEntry },
              $set: { lastLogin: new Date() }
            };

            await userCollection.updateOne(
              { email: profile.email },
              update
            );
          }

          // No need to store in sessionStorage
          // Session is managed via HTTP-only cookies

          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture || null,
            isActive: true,
          };
        } catch (error) {
          console.error("Google profile creation error:", error);
          throw error;
        }
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          prompt: "select_account"
        }
      },
      async profile(profile) {
        try {
          const client: MongoClient = await clientPromise;
          const db = client.db(MONGODB.dbName);
          const userCollection = db.collection<UserDocument>(MONGODB.collections.users);

          const loginHistoryEntry: LoginHistoryEntry = {
            timestamp: new Date(),
            provider: 'github',
            success: true,
            ip: null
          };

          const existingUser = await userCollection.findOne({
            email: profile.email,
          });

          if (!existingUser) {
            const newUser: Partial<UserDocument> = {
              name: profile.name || profile.login,
              email: profile.email,
              image: profile.avatar_url || null,
              createdAt: new Date(),
              lastLogin: new Date(),
              loginHistory: [loginHistoryEntry]
            };

            await userCollection.insertOne(newUser as UserDocument);
          } else {
            const update: UpdateFilter<UserDocument> = {
              $push: { loginHistory: loginHistoryEntry },
              $set: { lastLogin: new Date() }
            };

            await userCollection.updateOne(
              { email: profile.email },
              update
            );
          }

          return {
            id: profile.id.toString(),
            name: profile.name || profile.login,
            email: profile.email,
            image: profile.avatar_url || null,
            isActive: true,
          };
        } catch (error) {
          console.error("GitHub profile creation error:", error);
          throw error;
        }
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req): Promise<User | null> {
        if (!credentials?.email || !credentials.password) {
          console.error("[Auth] Missing credentials");
          throw new Error("MissingCredentials");
        }

        const client: MongoClient = await clientPromise;
        const db = client.db(MONGODB.dbName);
        const usersCollection = db.collection<UserDocument>(MONGODB.collections.users);
        const loginAttemptsCollection = db.collection<LoginAttemptDocument>(MONGODB.collections.loginAttempts);

        const MAX_ATTEMPTS = 5;
        const LOCKOUT_PERIOD_MS = 15 * 60 * 1000;
        const normalizedEmail = credentials.email.toLowerCase();

        let ipAddress: string | null = null;
        if (req?.headers) { // Check if req and req.headers exist
            const forwardedFor = req.headers['x-forwarded-for'];
            if (typeof forwardedFor === 'string') {
                ipAddress = forwardedFor.split(',')[0].trim();
            } else {
                ipAddress = req.headers['x-real-ip'] || null;
                // req.socket?.remoteAddress is not reliably available or typed here
            }
        }

        try {
          const query: any = { timestamp: { $gte: new Date(Date.now() - LOCKOUT_PERIOD_MS) } };
          const orConditions: Array<{ email: string } | { ip: string }> = [{ email: normalizedEmail }];
          if (ipAddress) {
            orConditions.push({ ip: ipAddress });
          }
          query.$or = orConditions;

          const recentAttempts = await loginAttemptsCollection.find(query)
            .sort({ timestamp: -1 })
            .limit(MAX_ATTEMPTS + 1)
            .toArray();

          const failedAttemptsInWindow = recentAttempts.filter(attempt => !attempt.success);

          if (failedAttemptsInWindow.length >= MAX_ATTEMPTS) {
            console.warn(`[Auth] Too many failed login attempts for email ${normalizedEmail} or IP ${ipAddress}. Blocking login.`);
            throw new Error("TooManyAttempts");
          }
        } catch (rateLimitError: any) {
          if (rateLimitError.message === "TooManyAttempts") {
            throw rateLimitError;
          }
          console.error("[Auth] Error during rate limit check:", rateLimitError);
        }

        const currentAttempt: Omit<LoginAttemptDocument, '_id'> = {
          email: normalizedEmail,
            timestamp: new Date(),
          success: false,
          ip: ipAddress,
            provider: 'credentials',
          };
        const attemptInsertResult = await loginAttemptsCollection.insertOne(currentAttempt as LoginAttemptDocument);
        const attemptId = attemptInsertResult.insertedId;

        try {
          const user = await usersCollection.findOne({ email: normalizedEmail });

          if (!user) {
            console.log(`[Auth] User not found: ${normalizedEmail}`);
            throw new Error("InvalidCredentials");
          }

          // Use isActive field, assuming UserDocument has it.
          if (user.isActive === false) { // Ensure UserDocument has isActive: boolean
            console.warn(`[Auth] Attempt to login to inactive/suspended account: ${normalizedEmail}`);
            await loginAttemptsCollection.updateOne({ _id: attemptId }, { $set: { success: false, reason: "AccountInactive" } });
            throw new Error("AccountSuspended");
          }

          const isPasswordValid = await compare(credentials.password, user.password);

          if (!isPasswordValid) {
            console.log(`[Auth] Invalid password for user: ${normalizedEmail}`);
            throw new Error("InvalidCredentials");
          }

          console.log(`[Auth] Successful login for user: ${normalizedEmail}`);
          await loginAttemptsCollection.updateOne({ _id: attemptId }, { $set: { success: true } });

          const loginHistoryEntry: Omit<LoginHistoryEntry, '_id'> = { // Omit _id for insertion
            timestamp: new Date(),
            provider: 'credentials',
            success: true,
            ip: ipAddress, // ip is now part of the type
            userId: user._id, // Assuming LoginHistoryEntry has userId
          };
          await usersCollection.updateOne(
            { _id: user._id },
            {
              $set: { lastLogin: new Date(), isActive: true }, // Ensure user is marked active on login
              $push: { loginHistory: loginHistoryEntry as LoginHistoryEntry }
            }
          );

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role ? (user.role as AppRole) : AppRole.USER,
            isActive: true,
          };

        } catch (authError: any) {
          if (authError.message !== "AccountSuspended") { // Avoid double update
            await loginAttemptsCollection.updateOne({ _id: attemptId }, { $set: { success: false, reason: authError.message } });
          }
          console.error(`[Auth] Authentication error for ${normalizedEmail}: ${authError.message}`);
          throw authError;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          const client: MongoClient = await clientPromise;
          const db = client.db(MONGODB.dbName);
          const userCollection = db.collection<UserDocument>(MONGODB.collections.users);

          const loginHistoryEntry: LoginHistoryEntry = {
            timestamp: new Date(),
            provider: account.provider,
            success: true,
            ip: null
          };

          const update: UpdateFilter<UserDocument> = {
            $push: { loginHistory: loginHistoryEntry },
            $set: {
              name: user.name,
              image: user.image || null,
              lastLogin: new Date(),
            }
          };

          await userCollection.updateOne(
            { email: user.email },
            update,
            { upsert: true }
          );
        } catch (error) {
          console.error("Sign-in error:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }): Promise<JWT> {
      if (user) { // user object is available on initial sign-in
        token.id = user.id;
        token.role = (user as User).role ? (user.role as AppRole) : AppRole.USER;
        token.isActive = (user as User).isActive;
        if (account) {
        token.provider = account.provider;
        }
      }
      // If CustomJWT has other mandatory fields like 'userId' or 'apiToken',
      // they need to be populated here or CustomJWT type needs adjustment.
      // For now, assuming CustomJWT uses 'id' for user identifier.
      return token; // Standard JWT, next-auth will handle CustomJWT mapping if types align
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      // token contains what we put in the jwt callback
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.isActive = token.isActive ?? true;
        if (token.provider) (session.user as any).provider = token.provider as string; // Using 'as any' for simplicity if CustomUser doesn't have provider
      }
      if (token.error) {
          session.error = token.error;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      try {
        const client: MongoClient = await clientPromise;
        const db = client.db(MONGODB.dbName);
        const userCollection = db.collection<UserDocument>(MONGODB.collections.users);
        
        if (token.email) {
          // No need to clear localStorage/sessionStorage anymore
          // Session is managed via HTTP-only cookies

          await userCollection.updateOne(
            { email: token.email },
            {
              $set: {
                lastLogout: new Date(),
              }
            }
          );
        }
      } catch (error) {
        console.error("Sign-out error:", error);
      }
    },
  },
};

export default NextAuth(authOptions);