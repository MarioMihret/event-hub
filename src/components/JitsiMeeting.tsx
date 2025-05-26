"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, AlertTriangle, Mic, MicOff, Video, VideoOff, RefreshCw, Loader2 } from 'lucide-react';
import { getJitsiIframeApi } from '@/utils/jitsi';
import { toast } from 'react-hot-toast';

interface JitsiMeetingProps {
  roomSlug: string;
  displayName: string;
  userEmail?: string;
  userId?: string;
  isModerator?: boolean;
  onClose: () => void;
  eventTitle?: string;
  jitsiContainerId?: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

const JitsiMeeting: React.FC<JitsiMeetingProps> = ({
  roomSlug,
  displayName,
  userEmail,
  userId,
  isModerator = false,
  onClose,
  eventTitle,
  jitsiContainerId,
}) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;
  const hasInitializedRef = useRef(false);

  const toggleAudio = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
  }, []);

  const cleanupJitsi = useCallback(() => {
    try {
      if (jitsiApiRef.current) {
        console.log('Disposing Jitsi instance');
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    } catch (err) {
      console.error('Error during Jitsi cleanup:', err);
    }
  }, []);

  const retryInitialization = useCallback(() => {
    if (retryCount < maxRetries) {
      console.log(`Retrying JaaS initialization, attempt ${retryCount + 1}`);
      setError(null);
      setIsLoading(true);
      setRetryCount(prev => prev + 1);
      cleanupJitsi();
    } else {
      setError('Failed to initialize JaaS meeting after multiple attempts. Please check your connection or contact support.');
      setIsLoading(false);
    }
  }, [retryCount, maxRetries, cleanupJitsi]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    if (hasInitializedRef.current && jitsiApiRef.current && retryCount === 0) {
      console.log('JitsiMeeting: Skipping re-initialization as API already exists and not retrying.');
      setIsLoading(false);
      return;
    }

    if (retryCount === 0) {
      setIsLoading(true);
      setError(null);
    }

    const initJitsiWithToken = async () => {
      const parentNode = jitsiContainerId 
        ? document.getElementById(jitsiContainerId) 
        : jitsiContainerRef.current;

      if (!parentNode) {
        if (isMounted) {
          setError(jitsiContainerId ? `Jitsi container with ID '${jitsiContainerId}' not found.` : 'Jitsi container ref not found.');
          setIsLoading(false);
        }
        return;
      }
      if (!roomSlug) {
        if (isMounted) {
          setError('Room name (slug) is required for JaaS meeting.');
          setIsLoading(false);
        }
        return;
      }

      try {
        console.log(`Attempting to join JaaS room: '${roomSlug}'`);

        // Parameters for the JaaS token generation API route
        // These include room, user details, and moderator status
        const tokenParams = new URLSearchParams({
          room: roomSlug.trim().toLowerCase(),
          name: displayName,
        });
        if (userEmail) tokenParams.append('email', userEmail);
        if (userId) tokenParams.append('userId', userId);
        if (isModerator) tokenParams.append('moderator', 'true');

        console.log(`Fetching JaaS token for room: ${roomSlug} with params: ${tokenParams.toString()}`);
        const tokenResponse = await fetch(`/api/jitsi/generate-token?${tokenParams.toString()}`);
        
        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({}));
          const errorMessage = errorData.error || `Failed to fetch JaaS token: ${tokenResponse.statusText}`;
          console.error('Token fetch error:', errorMessage, errorData);
          throw new Error(errorMessage);
        }
        const { token: jaasToken } = await tokenResponse.json();

        if (!jaasToken) {
          throw new Error('Received empty JaaS token.');
        }
        console.log('JaaS Token fetched successfully:', jaasToken);
        console.log(`Token generated for room: '${tokenParams.get('room')}'`);

        const JitsiMeetExternalAPI = await getJitsiIframeApi();
        if (!isMounted) return;

        const appId = process.env.NEXT_PUBLIC_JAAS_APP_ID;
        // Determine the correct domain: Use NEXT_PUBLIC_JAAS_DOMAIN if set, otherwise construct from appId, or error if no appId.
        let domain = process.env.NEXT_PUBLIC_JAAS_DOMAIN;
        if (!domain && appId) {
          domain = `${appId}.8x8.vc`; // Construct the domain from the appId
          console.warn(`NEXT_PUBLIC_JAAS_DOMAIN was not set. Falling back to constructed domain: ${domain}`);
        } else if (!domain && !appId) {
          console.error('Neither NEXT_PUBLIC_JAAS_DOMAIN nor NEXT_PUBLIC_JAAS_APP_ID are defined. JaaS meetings will not work.');
          if (isMounted) {
            setError('JaaS domain and App ID are not configured. Please contact support.');
            setIsLoading(false);
          }
          return;
        }

        console.log('JitsiMeeting: Using JaaS App ID:', appId);
        console.log('JitsiMeeting: Using JaaS Domain for API constructor:', domain);

        if (!appId) { // This check is somewhat redundant now due to the domain logic above, but good for safety
          console.error('NEXT_PUBLIC_JAAS_APP_ID is not defined. JaaS meetings will not work.');
          if (isMounted) {
            setError('JaaS App ID is not configured. Please contact support.');
            setIsLoading(false);
          }
          return;
        }
        
        const options = {
          roomName: `${appId}/${roomSlug.trim().toLowerCase()}`,
          jwt: jaasToken,
          width: '100%',
          height: '100%',
          parentNode: parentNode,
          lang: 'en',
          userInfo: {
            displayName: displayName
          },
          attributes: {
            allow: "camera; microphone; fullscreen; display-capture; autoplay; screen-wake-lock",
          },
          // Attempt to override localStorage settings via URL parameters
          urlParams: {
            'config.startWithAudioMuted': true,
            'config.startWithVideoMuted': true,
            'config.disableSelfView': false,
            // The following helps ensure that the client doesn't use local storage to override config from the token.
            'config.enableUserRolesBasedOnToken': true
          },
          configOverwrite: {
            hosts: {
              domain: `${appId}.8x8.vc`,
              muc: `conference.${appId}.8x8.vc`,
              focus: `focus.${appId}.8x8.vc`
            },
            serviceUrl: `https://${appId}.8x8.vc/http-bind`,
            prejoinPageEnabled: true,
            startWithAudioMuted: true,
            startWithVideoMuted: true,
            enableWelcomePage: false,
            enableClosePage: true,
            disableDeepLinking: true,
            enableUserRolesBasedOnToken: true,
            disableSelfView: false,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat', 'etherpad',
              'sharedvideo', 'settings', 'raisehand', 'videoquality',
              'filmstrip', 'feedback', 'stats', 'shortcuts',
              'tileview', 'select-background',
              'mute-everyone', 'security', 'toggle-camera'
            ],
            SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'sounds'],
            MOBILE_APP_PROMO: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            TOOLBAR_ALWAYS_VISIBLE: false,
            HIDE_INVITE_MORE_HEADER: true,
          },
          subject: eventTitle || 'Meeting',
        };

        // Enhanced logging before API initialization
        console.log("--- Jitsi API Initialization Details ---");
        console.log("Domain for JitsiMeetExternalAPI constructor:", domain);
        console.log("AppID being used:", appId);
        console.log("Raw roomSlug prop:", roomSlug);
        console.log("Processed roomName for options:", `${appId}/${roomSlug.trim().toLowerCase()}`);
        console.log("JWT being used (first 50 chars):", jaasToken.substring(0, 50) + "...");
        console.log("Parent node for Jitsi Iframe:", parentNode);
        console.log("ConfigOverwrite Hosts:", JSON.stringify(options.configOverwrite.hosts, null, 2));
        console.log("ConfigOverwrite ServiceURL:", options.configOverwrite.serviceUrl);
        console.log("Full options object (excluding parentNode and JWT for brevity in main log):");
        const { parentNode: _p, jwt: _j, ...optionsForLog } = options;
        console.log(JSON.stringify(optionsForLog, null, 2));
        console.log("---------------------------------------");

        console.log(`Initializing JaaS with domain: ${domain}, options.roomName: ${options.roomName}, MUC: ${options.configOverwrite.hosts.muc}`);
        jitsiApiRef.current = new JitsiMeetExternalAPI(domain, options);

        jitsiApiRef.current.addEventListeners({
          readyToClose: () => {
            console.log('JaaS readyToClose event');
            if (isMounted) onClose();
          },
          videoConferenceJoined: () => {
            console.log('Joined JaaS meeting:', roomSlug);
            if (isMounted) {
              setIsLoading(false);
              setRetryCount(0);
              hasInitializedRef.current = true;
              toast.success('Joined the meeting!');
              if (jitsiApiRef.current) {
                // Ensure video is muted explicitly after joining
                jitsiApiRef.current.executeCommand('setVideoMute', true);

                jitsiApiRef.current.isAudioMuted().then((muted: boolean) => {
                  if (isMounted) setIsMuted(muted);
                });
                jitsiApiRef.current.isVideoMuted().then((muted: boolean) => {
                  if (isMounted) setIsVideoOff(muted);
                });
              }
            }
          },
          audioMuteStatusChanged: (event: { muted: boolean }) => {
            if (isMounted) setIsMuted(event.muted);
          },
          videoMuteStatusChanged: (event: { muted: boolean }) => {
            if (isMounted) setIsVideoOff(event.muted);
          },
          participantLeft: (event: any) => {
            console.log('Participant left:', event);
          },
          errorOccurred: (errorEvent: any) => {
            console.error('JaaS API errorOccurred RAW:', errorEvent);
            if (isMounted) {
              let userFriendlyMessage = `JaaS Error: ${errorEvent.error?.message || errorEvent.message || 'Unknown error'}`;
              if (errorEvent.error?.name === 'conference.password_required') {
                userFriendlyMessage = 'This meeting requires a password.';
              } else if (errorEvent.error?.name === 'connection.droppedError') {
                userFriendlyMessage = 'Connection dropped. Please check your internet and try rejoining.';
              } else if (errorEvent.error?.name === 'conference.connectionError.notAllowed') {
                userFriendlyMessage = 'JaaS Error: Not allowed. Room and token may be mismatched or an internal error occurred.';
              }

              setError(userFriendlyMessage);
              const isNonRetryable = errorEvent.error?.name === 'conference.password_required'; 

              if (!isNonRetryable && retryCount < maxRetries) {
                toast.error(`Error: ${errorEvent.error?.message || errorEvent.message}. Retrying...`);
                retryInitialization();
              } else {
                setIsLoading(false);
              }
            }
          }
        });

      } catch (err: any) {
        console.error('Error in initJitsiWithToken (MAIN CATCH BLOCK):', err);
        if (isMounted) {
          toast.error(err.message || 'Failed to initialize JaaS meeting.');
          if (retryCount < maxRetries) {
            retryInitialization();
          } else {
            setError(err.message || 'Failed to initialize JaaS. Please check your internet connection and try again.');
            setIsLoading(false);
          }
        }
      }
    };

    if (isMounted) {
      initJitsiWithToken();
    }

    return () => {
      isMounted = false;
      console.log('JitsiMeeting component unmounting, performing cleanup.');
      cleanupJitsi();
    };
  }, [roomSlug, displayName, userEmail, userId, isModerator, onClose, cleanupJitsi, retryCount, retryInitialization, eventTitle, jitsiContainerId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center text-white" role="status">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400 mb-4" />
        <p className="text-lg">Joining meeting: {eventTitle || roomSlug}...</p>
        {retryCount > 0 && <p className="text-sm text-yellow-400 mt-2">Attempt {retryCount + 1} of {maxRetries + 1}...</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center text-white p-4" role="alert">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Error Loading Meeting</h3>
        <p className="text-center mb-4 max-w-md">{error}</p>
        {retryCount < maxRetries && (
          <button 
            onClick={retryInitialization} 
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-md flex items-center gap-2 mb-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        )}
        <button 
          onClick={onClose} 
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4">
      <div className={`bg-gray-900 rounded-lg shadow-2xl w-full h-full flex flex-col relative overflow-hidden border border-gray-700 ${!jitsiContainerId ? 'p-1' : ''}`}>
        <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white truncate" title={eventTitle || roomSlug}>
            {eventTitle || roomSlug}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 rounded-full hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="Close Meeting"
          >
            <X size={22} />
          </button>
        </div>

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-90 z-20">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
            <p className="text-white text-lg">Joining meeting...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-95 z-20 p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-400 text-lg mb-3">Error Loading Meeting</p>
            <p className="text-gray-300 text-sm mb-6">{error}</p>
            {retryCount < maxRetries && (
              <button
                onClick={retryInitialization}
                className="px-4 py-2 bg-yellow-500 text-black rounded-md hover:bg-yellow-600 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={18} /> Try Again
              </button>
            )}
          </div>
        )}

        {!jitsiContainerId && (
          <div ref={jitsiContainerRef} className="flex-grow w-full h-full bg-black rounded-b-md" />
        )}

        {!isLoading && !error && jitsiApiRef.current && (
           <div className="p-2 bg-gray-800 border-t border-gray-700 flex items-center justify-center gap-3">
            <button
              onClick={toggleAudio}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className={`p-2 rounded-full transition-colors ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-500'} text-white`}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              onClick={toggleVideo}
              title={isVideoOff ? 'Start Video' : 'Stop Video'}
              className={`p-2 rounded-full transition-colors ${isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-500'} text-white`}
            >
              {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
            <button
              onClick={onClose}
              title="Leave Meeting"
              className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JitsiMeeting; 