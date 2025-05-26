import { NextRequest } from 'next/server';

/**
 * Attempts to get the client's IP address from the request headers.
 * Handles Vercel's `x-forwarded-for` and other common headers.
 * 
 * @param request - The NextRequest object.
 * @returns The client's IP address string, or null if not found.
 */
export function getClientIp(request: NextRequest): string | null {
  // Check Vercel specific header first
  let ip = request.headers.get('x-forwarded-for');
  
  if (ip) {
    // The header can contain a comma-separated list (e.g., client, proxy1, proxy2)
    // The client's IP is typically the first one.
    const forwardedIps = ip.split(',').map(item => item.trim());
    if (forwardedIps[0]) {
      return forwardedIps[0];
    }
  }

  // Check other common headers
  ip = request.headers.get('x-real-ip');
  if (ip) {
    return ip;
  }
  
  // Could not determine IP
  return null;
} 