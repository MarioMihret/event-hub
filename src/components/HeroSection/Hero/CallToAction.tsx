"use client"
import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, LogIn, ArrowRight } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { Tooltip } from '@/app/Tooltip';

const CallToAction = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleCreateEvent = () => {
    if (!session) {
      signIn(undefined, { callbackUrl: '/organizer' });
      return;
    }
    router.push('/organizer');
  };

  const handleBrowseEvents = () => {
    router.push('/events');
  };

  return (
    <div className="flex flex-col gap-5 sm:flex-row animate-fade-in-delay">
      <Tooltip content={session ? "Create and manage your own events" : "Login required to create events"}>
        <button
          onClick={handleCreateEvent}
          aria-label={session ? "Create Event" : "Login to Create Event"}
          className={`group flex items-center justify-center gap-3 px-8 py-4 font-semibold text-white transition-all duration-300 transform rounded-xl shadow-lg
            ${session 
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 hover:scale-102 hover:shadow-xl shadow-purple-900/20' 
              : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 shadow-gray-900/20'
            } relative overflow-hidden`}
        >
          {status === 'loading' ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Loading...</span>
            </div>
          ) : (
            <>
              <Calendar className="w-5 h-5" />
              <span>{session ? 'Create Event' : 'Login to Create Event'}</span>
              <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1" />
            </>
          )}
          
          {!session && status !== 'loading' && (
            <span className="absolute top-0 right-0 p-1 bg-blue-500 rounded-bl-lg">
              <LogIn className="w-4 h-4" />
            </span>
          )}
        </button>
      </Tooltip>

      <Tooltip content="Discover upcoming events">
        <button
          onClick={handleBrowseEvents}
          aria-label="Browse Events"
          className="group flex items-center justify-center gap-3 px-8 py-4 font-semibold text-white transition-all duration-300 transform bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/15 hover:scale-102 shadow-lg shadow-black/20"
        >
          <Users className="w-5 h-5" />
          <span>Browse Events</span>
          <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1" />
        </button>
      </Tooltip>
    </div>
  );
};

export default CallToAction;