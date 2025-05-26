import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createPrivateKey, KeyObject } from 'crypto';
import { logger } from "@/utils/logger";
import { createErrorResponse } from "@/utils/apiUtils";

// Simplified helper function if JAAS_PRIVATE_KEY has the correctly formatted PEM
async function importPrivateKey(pemKeyString: string): Promise<KeyObject> {
  try {
    // The pemKeyString from process.env.JAAS_PRIVATE_KEY should be the direct,
    // correctly formatted multi-line PEM.
    // Ensure it's trimmed of any leading/trailing whitespace from the env var.
    const key = pemKeyString.trim();
    if (!key.startsWith("-----BEGIN PRIVATE KEY-----") || !key.endsWith("-----END PRIVATE KEY-----")) {
        throw new Error("Private key in environment variable does not have valid PEM header/footer.");
    }
    return createPrivateKey(key);
  } catch (error) {
    logger.error('[JaaS Token] Failed to import private key from JAAS_PRIVATE_KEY:', { 
      errorMessage: error instanceof Error ? error.message : String(error),
      keyPreview: pemKeyString.substring(0, 70) + "..." 
    });
    throw new Error('Failed to import JaaS private key from JAAS_PRIVATE_KEY. Ensure it is a valid, multi-line PEM string in the environment variable.');
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const appId = process.env.JAAS_APP_ID;
  const apiKeyId = process.env.JAAS_API_KEY_ID;
  // *** Use JAAS_PRIVATE_KEY directly ***
  const privateKeyPemString = process.env.JAAS_PRIVATE_KEY; 

  // console.log("--- JaaS Env Var Debug --- ");
  // console.log(`JAAS_APP_ID read as: [${appId}]`);
  // console.log(`JAAS_API_KEY_ID read as: [${apiKeyId}]`);
  // console.log(`JAAS_PRIVATE_KEY content loaded: ${!!privateKeyPemString}`);
  // console.log("----------------------------");

  if (!appId || !apiKeyId || !privateKeyPemString) {
    logger.error('[JaaS Token] Missing required environment variables (JAAS_APP_ID, JAAS_API_KEY_ID, JAAS_PRIVATE_KEY).');
    return createErrorResponse('JaaS environment variables not configured correctly.', 500);
  }

  try {
    const room = searchParams.get('room');
    const userName = searchParams.get('name') || 'Guest';
    const userEmail = searchParams.get('email') || undefined; 
    const userAvatar = searchParams.get('avatar') || undefined; 
    const isModerator = searchParams.get('moderator') === 'true';
    const userId = searchParams.get('userId') || userEmail || userName.replace(/\s+/g, '_');

    if (!room) {
      logger.warn('[JaaS Token] Missing required query parameter: room');
      return createErrorResponse('Missing required query parameter: room', 400);
    }

    console.log(`Generating token for room name: '${room}'`);

    const privateKey = await importPrivateKey(privateKeyPemString);

    const now = Math.floor(Date.now() / 1000);
    const expires = now + (60 * 60 * 3); // 3 hours

    // Payload for 'jose' library
    const payload = {
      aud: 'jitsi',
      iss: 'chat', 
      sub: appId, 
      room: room,
      context: {
        user: {
          id: userId,
          name: userName,
          avatar: userAvatar,
          email: userEmail,
          moderator: isModerator
        },
        features: {
          livestreaming: isModerator,
          recording: isModerator,
          transcription: true,
          'outbound-call': false
        }
      }
      // exp and nbf are set by .setExpirationTime() and .setNotBefore() for jose
    };

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: apiKeyId, typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(expires)
      .setNotBefore(now - 10)
      .sign(privateKey);

    logger.info(`[JaaS Token] Generated token for room: ${room}`);
    return NextResponse.json({ token: jwt });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during token generation.';
    logger.error('[JaaS Token] Error generating token:', { errorMessage, errorDetails: String(error) }); 
    return createErrorResponse(`Failed to generate JaaS token. ${errorMessage.includes('private key') ? 'Check JAAS_PRIVATE_KEY content.' : 'Internal server error.'}`, 500);
  }
} 