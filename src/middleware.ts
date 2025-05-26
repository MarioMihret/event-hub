import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";
import { getSessionFromCache, setSessionInCache } from './utils/sessionCache';
import { getToken } from "next-auth/jwt";

// Determine the correct session token cookie name based on the environment
const sessionCookieName = process.env.NODE_ENV === 'production'
  ? `__Secure-user-app.session-token`
  : `user-app.session-token`;

// Cache TTLs
const USER_STATUS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// Removing AUTH_RESULT_CACHE_TTL as the revised logic simplifies authorization caching need within middleware itself
// const AUTH_RESULT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Helper function to check if a path matches any pattern in the matcher config
const isPathProtectedByMatcher = (pathname: string): boolean => {
  return config.matcher.some(pattern => {
    // Convert Next.js matcher pattern to a regex string
    let regexString = pattern
      // Escape special regex characters, except for *, :, and / (used in patterns)
      .replace(/[.+?^\]$(){}=!<>|]/g, "\\$&")  // Escape ., +, ?, ^, etc.
      // Convert /:param* at the end of a segment or string to match a path or nothing
      .replace(/\/:([a-zA-Z_]\w*)\*$/g, "(?:\\/(?<$1>[^/]+(?:\\/[^/]+)*))?") // Matches /param or /param/sub/path or nothing if at end
      .replace(/\/:([a-zA-Z_]\w*)\*\//g, "(?:\\/(?<$1>[^/]+(?:\\/[^/]+)*))\\/") // Matches /param/sub/path/ for middle parts
      // Convert /:param to match a single path segment, ensuring it captures the param name
      .replace(/\/:([a-zA-Z_]\w*)/g, "\\/(?<$1>[^/]+)");

    // Ensure it matches the whole path correctly
    regexString = `^${regexString}$`;

    // ---- START DEBUG LOG FOR SPECIFIC CASE ----
    if (pathname === "/payments/meeting" && pattern === "/payments/:path*") {
      console.log(`DEBUG isPathProtectedByMatcher: For /payments/meeting with pattern /payments/:path*`);
      console.log(`  Pattern: '${pattern}'`);
      console.log(`  Pathname: '${pathname}'`);
      console.log(`  Generated Regex (LATEST LOGIC): '${regexString}'`);
      try {
        const regex = new RegExp(regexString);
        const testResult = regex.test(pathname);
        console.log(`  Test Result (LATEST LOGIC): ${testResult}`);
      } catch (e: any) {
        console.error(`  Middleware (DEBUG LATEST LOGIC): Invalid regex for pattern '${pattern}'. Error: ${e.message}`);
      }
    }
    // ---- END DEBUG LOG FOR SPECIFIC CASE ----

    try {
      const regex = new RegExp(regexString);
      return regex.test(pathname);
    } catch (e) {
      console.error(`Middleware: Invalid regex generated from matcher pattern: '${pattern}' -> '${regexString}'`, e);
      return false; // Treat invalid patterns as non-matching
    }
  });
};


// Custom middleware combining authentication and visibility checks
export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const referer = req.headers.get("referer"); // Track where the user is coming from
    const startTime = Date.now();

    // Get token data using the custom cookie name. This getToken call is for use *within* this middleware function if needed.
    // The `token` in `authorized` callback is populated by `withAuth` using its own config (see below).
    const tokenFromUtil = await getToken({ req, cookieName: sessionCookieName }); 

    // Check for suspension if token (from withAuth, or tokenFromUtil if preferred) exists
    // It's generally better to rely on the token provided by withAuth to its callbacks if possible.
    // For this example, we'll assume the `authorized` callback's `token` is the primary one.
    const currentToken = await getToken({ req, cookieName: sessionCookieName }); // Re-fetch or rely on token from authorized callback

    if (currentToken?.email) {
      try {
        const skipCache = req.url.includes('_forceFresh=true');
        const cacheKey = `user_status_${currentToken.email}`;
        let userData = null;
        
        if (!skipCache) {
          userData = getSessionFromCache(cacheKey);
        }
        
        if (!userData) {
          const resp = await fetch(`${req.nextUrl.origin}/api/users/status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({ email: currentToken.email }),
          });
          
          if (resp.ok) {
            userData = await resp.json();
            setSessionInCache(cacheKey, userData, USER_STATUS_CACHE_TTL);
          } else {
             console.error(`Middleware: Failed to fetch user status for ${currentToken.email}, status: ${resp.status}. Redirecting to signin.`);
             const signInUrl = new URL("/auth/signin", req.url);
             signInUrl.searchParams.set("error", "UserStatusCheckFailed");
             if (req.nextUrl.pathname !== "/auth/signin") {
                signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
             }
             return NextResponse.redirect(signInUrl);
          }
        }
        
        if (userData?.isActive === false) {
          console.log(`Middleware: Redirecting suspended user ${currentToken.email} to /account-suspended`);
          const response = NextResponse.redirect(new URL('/account-suspended', req.url));
          response.cookies.set(sessionCookieName, '', { expires: new Date(0), path: '/' });
          // Also clear the legacy next-auth.session-token if it was somehow set by a misconfiguration or old version
          response.cookies.set('next-auth.session-token', '', { expires: new Date(0), path: '/' }); 
          return response;
        }
      } catch (error) {
        console.error("Middleware: Error checking user suspension:", error);
        const signInUrl = new URL("/auth/signin", req.url);
        signInUrl.searchParams.set("error", "SuspensionCheckFailed");
        return NextResponse.redirect(signInUrl);
      }
    }

    // --- Revised Logic Start ---

    // Define public paths (adjust as needed)
    const publicPaths = [
      '/',
      '/events', // Event list is public
      '/about',
      '/contact',
      '/auth/signin',
      '/auth/signup',
      '/auth/error',
      '/auth/forgot-password', // Assuming these exist
      '/auth/verify-request',
      '/account-suspended',
      // Add '/api/auth/...' if needed, though API routes are often handled separately
    ];

    // Allow specific paths (API, static files, public files)
    if (
      pathname.startsWith('/api/') || // Allow all API routes (auth handled internally or by framework)
      pathname.startsWith('/_next/') || // Next.js internals
      pathname.includes('.') // Basic check for files (e.g., favicon.ico, image.png)
    ) {
      return NextResponse.next(); // Allow request
    }

    // Check if the current path is explicitly public
    if (publicPaths.some(path => pathname === path)) {
      return NextResponse.next(); // Allow request
    }
    
    // Allow public access to specific event pages (e.g., /events/[id])
    // This overrides the matcher for specific sub-paths if needed for public view
    // Example: If event details pages should sometimes be public
    // if (pathname.startsWith('/events/') && !pathname.endsWith('/edit')) { // Allow viewing but not editing
    //   return NextResponse.next();
    // }
    // For now, we assume /events/:path* requires auth based on the matcher


    // --- End Revised Logic ---

    // At this point: Path is NOT internal/static, NOT explicitly public.
    // It might be a path covered by the `matcher` (e.g., /organizer/create) OR
    // a path NOT covered by the `matcher` that requires auth (e.g., /settings).

    // If the path is NOT protected by the matcher config, but is not public,
    // we still need to ensure the user is authenticated.
    if (!isPathProtectedByMatcher(pathname)) {
      if (!currentToken) { // Check the token resolved by getToken with custom cookie name
         console.log(`Middleware: Redirecting unauthenticated user from non-matcher path ${pathname} to signin.`);
         const signInUrl = new URL("/auth/signin", req.url);
         signInUrl.searchParams.set("callbackUrl", req.nextUrl.href); // Add callback URL
         return NextResponse.redirect(signInUrl);
      }
      console.log(`Middleware: Allowing authenticated user to non-matcher path ${pathname}`);
      return NextResponse.next();
    }

    // If the path IS protected by the matcher, and `authorized` returned true, the token is valid.
    // Suspension check has already run.
    console.log(`Middleware: Allowing authenticated, non-suspended user to matcher path ${pathname}`);
    return NextResponse.next();
    
    // Log middleware execution time in development only (moved down)
    // if (process.env.NODE_ENV !== 'production') {
    //   const duration = Date.now() - startTime;
    //   console.log(`Middleware processed ${pathname} in ${duration}ms`);
    // }

  },
  {
    callbacks: {
      authorized: ({ token /* This token is resolved by withAuth using below config */, req }) => {
        const { pathname } = req.nextUrl;
        const requiresAuth = isPathProtectedByMatcher(pathname);
        if (requiresAuth) {
          return !!token; // If path requires auth, token must exist
        }
        return true; // If path doesn't require auth by matcher, allow access (main middleware handles further)
      },
    },
    jwt: {
      // Secret should be picked up from NEXTAUTH_SECRET env var by default
      // decode: async (params) => { /* advanced custom decoding if needed */ }
    },
    cookies: {
      sessionToken: { // For NextAuth v4+, this structure might be under `cookies` directly
        name: sessionCookieName,
      },
      // If you have other custom cookie names defined in authOptions (callbackUrl, csrfToken),
      // ensure they are also specified here if withAuth needs to interact with them directly.
      // For basic session token checking, sessionToken.name is the most crucial.
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error', // Optional: error page
    },
  }
);

// Keep the matcher - it defines which routes MUST trigger the 'authorized' callback check first.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - Handled separately
     * - _next/static (static files) - Handled by Next.js
     * - _next/image (image optimization files) - Handled by Next.js
     * - favicon.ico (favicon file) - Handled by Next.js
     * - / (root path) - Often public
     * - /events (event list) - Public
     * - /auth/... (auth pages) - Public
     * - /about, /contact, etc. - Public
     * Matcher should primarily list protected routes or routes needing upfront checks.
     */
     // '/:path*' // This is too broad, use specific protected paths
     
     // Protected routes needing upfront token check via `authorized` callback:
     "/events/:id/edit", // Example: Only editing requires auth upfront
     "/organizer/:path*", // All organizer routes require auth upfront
     "/settings/:path*", // Example: Settings pages require auth upfront
     "/payments/:path*", // Example: Payment pages may require auth upfront (except success/ticket if params handle auth)
     
     // Note: '/events/:id' (viewing) is NOT listed here, assuming viewing might be public
     // or handled within the main middleware / page component based on event visibility.
     // If ALL event details pages require login, add "/events/:path*" here.
     // Current setup assumes /events/:path* viewing is handled after main middleware runs.
  ],
};

