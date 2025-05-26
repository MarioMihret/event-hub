"use client"
import React from "react";
import { Event } from "../../../../../types/event";
import EventCard from "../../../../userEvent/EventCard";

interface EventGridProps {
  events: Event[];
  isAuthenticated?: boolean;
  onDelete?: (id: string) => void;
}

const EventGrid = React.memo<EventGridProps>(({
  events,
  isAuthenticated = true,
  onDelete,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard
          key={event._id}
          event={event}
          isAuthenticated={isAuthenticated}
          onDelete={onDelete ? () => onDelete(event._id) : undefined}
        />
      ))}
    </div>
  );
});

EventGrid.displayName = 'EventGrid';

export default EventGrid;