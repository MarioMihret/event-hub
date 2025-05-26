"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  Target, 
  Tag, 
  MessageCircle, 
  List, 
  Share2,
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
  Image as ImageIcon,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  Mail,
  Link as LinkIcon,
  X,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { format, isAfter, parseISO } from 'date-fns';
import DOMPurify from 'dompurify';

// Import our reusable components
import EventHeroBanner from "./EventHeroBanner";
import EventActionBar from "./EventActionBar";
import DateTimeSection from "./DateTimeSection";
import LocationSection from "./LocationSection";
// import CapacitySection from "./CapacitySection";
import TagsSection from "./TagsSection";
import NoiseBackground from "@/components/ui/NoiseBackground";
import EventDescriptionSection from "./EventDescriptionSection";
import EventSpeakersSection from "./EventSpeakersSection";
import EventAudienceReqsSection from "./EventAudienceReqsSection";
import EventLogoSection from "./EventLogoSection";

// Import types
import type { Event, EventStatus } from "@/types/event";
import type { Speaker } from "@/types/speaker";

// Helper function to check if an event is expired
const isEventExpired = (event: Event): boolean => {
  if (!event.date) return false;
  
  const now = new Date();
  const eventDate = new Date(event.date);
  
  // If the event has an end date, use that for comparison
  if (event.endDate) {
    const endDate = new Date(event.endDate);
    return endDate < now;
  }
  
  // If it has a duration, calculate the end time
  if (event.duration && typeof event.duration === 'number') {
    const endTime = new Date(eventDate.getTime() + (event.duration * 60 * 1000));
    return endTime < now;
  }
  
  // Default to checking if the start date is in the past
  return eventDate < now;
};

// Our ExtendedEvent type using an intersection
type ExtendedEvent = Event & {
  relatedEvents?: Event[];
  streamingUrl?: string;
  speakers?: Speaker[] | { [key: string]: any }[];
  logo?: { url: string; attribution?: { photographer?: string } };
  isOwner?: boolean;
  isRegistered?: boolean;
  userOrderId?: string;
  isLikedByCurrentUser?: boolean;
};

interface EventDetailsProps {
  event: ExtendedEvent;
}

export default function EventDetails({ event }: EventDetailsProps) {
  const isOwner = !!event.isOwner;
  const isRegistered = !!event.isRegistered;
  const router = useRouter();
  const [isExpired, setIsExpired] = useState(false);
  const [normalizedSpeakers, setNormalizedSpeakers] = useState<Speaker[]>([]);
  
  useEffect(() => {
    console.log("EventDetails received event:", event?._id);
    console.log("Event title:", event?.title);
    console.log("Has speakers:", !!event?.speakers?.length);
    console.log("Has logo:", !!event?.logo);
  }, [event]);
  
  useEffect(() => {
    setIsExpired(isEventExpired(event));
  }, [event]);

  // Normalize speakers
  useEffect(() => {
    if (!event.speakers) {
        setNormalizedSpeakers([]);
        return;
    }
    const speakersArray = Array.isArray(event.speakers) ? event.speakers : [event.speakers];
    if (speakersArray.length === 0) {
        setNormalizedSpeakers([]);
        return;
    }
    const normSpeakers = speakersArray.map((speaker, index): Speaker => {
        if (typeof speaker === 'string') {
            return { id: String(index), name: speaker, role: 'Speaker' };
        }
        if (typeof speaker === 'object' && speaker !== null && 'name' in speaker) {
            return {
                id: String(speaker.id || index),
                name: speaker.name || 'Unknown Speaker',
                role: speaker.role || speaker.title || 'Speaker',
                image: speaker.image || speaker.avatar || speaker.photo || speaker.picture,
                bio: speaker.bio || speaker.description || speaker.about,
            };
        }
        return {
            id: String(index),
            name: typeof speaker === 'object' && speaker !== null && 'title' in speaker ? speaker.title : 'Unknown Speaker',
            role: 'Speaker',
            image: typeof speaker === 'object' && speaker !== null && ('avatar' in speaker || 'image' in speaker || 'photo' in speaker || 'picture' in speaker) ? (speaker.avatar || speaker.image || speaker.photo || speaker.picture) : undefined,
            bio: typeof speaker === 'object' && speaker !== null && ('description' in speaker || 'bio' in speaker || 'about' in speaker) ? (speaker.description || speaker.bio || speaker.about) : undefined,
        };
    });
    setNormalizedSpeakers(normSpeakers);
  }, [event.speakers]);

  const isFreeEvent = event.price === 0 || (event.tickets && event.tickets.every((ticket) => ticket.price === 0));

  if (!event || !event._id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Event not found or invalid event ID</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-4 w-full overflow-x-hidden">
      <NoiseBackground />
      <EventHeroBanner event={event} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mt-6 mb-12 w-full px-4 sm:px-6 lg:px-8"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A0D25]/30 to-transparent opacity-50 pointer-events-none rounded-2xl blur-xl -z-10"></div>
        
        <EventActionBar 
          event={event} 
          isExpired={isExpired} 
          isRegistered={isRegistered}
          isOwner={isOwner} 
        />

        {(event.isOwner || event.isRegistered) && (
          <div className="my-3 p-3 bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/30 rounded-lg text-center text-sm">
            {event.isOwner ? (
              <span className="font-medium text-purple-300">🎉 You are the organizer of this event.</span>
            ) : event.isRegistered ? (
              <span className="font-medium text-green-300">✅ You are registered for this event.</span>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6 relative"
          >
            <div className="absolute top-0 left-0 w-20 h-20 bg-[#b967ff]/10 rounded-full filter blur-3xl -z-10"></div>
            <DateTimeSection event={event} />
            <LocationSection 
              event={event} 
              isRegistered={isRegistered} 
              userOrderId={event.userOrderId} 
              isOwner={isOwner}
            />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6 relative"
          >
            <div className="absolute top-1/2 right-0 w-24 h-24 bg-[#6c3aad]/10 rounded-full filter blur-3xl -z-10"></div>
            {/* <CapacitySection event={event} /> */}
            <TagsSection event={event} />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6 relative hidden xl:block"
          >
            {/* Can add additional sections here in the future */}
          </motion.div>
        </div>

        <EventLogoSection event={event} />
        <EventDescriptionSection event={event} />
        <EventSpeakersSection speakers={normalizedSpeakers} />
        <EventAudienceReqsSection event={event} />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row justify-between items-center my-8 pt-6 border-t border-[#b967ff]/20 relative"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b967ff]/20 to-transparent"></div>
          
          <Link
            href="/events"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group relative overflow-hidden px-4 py-2"
          >
            <span className="absolute inset-0 w-full h-full bg-[#b967ff]/5 rounded-md -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
            <span>Back to Events</span>
          </Link>
        </motion.div>
        
        {isOwner && event.metadata && Object.keys(event.metadata).length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-xs text-gray-500 border-t border-[#b967ff]/10 pt-4 mt-8 overflow-x-auto"
          >
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {event.metadata.createdBy && (
                <span>Created by: {event.metadata.createdBy}</span>
              )}
              <span>Created at: {new Date(event.metadata.createdAt).toLocaleDateString()}</span>
              <span>Updated at: {new Date(event.metadata.updatedAt).toLocaleDateString()}</span>
              {event.metadata.lastModifiedBy && (
                <span>Last modified by: {event.metadata.lastModifiedBy}</span>
              )}
              <span className="text-gray-600">ID: {event._id}</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
} 