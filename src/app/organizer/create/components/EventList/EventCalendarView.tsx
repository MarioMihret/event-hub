"use client"
import React from 'react';
import { Calendar } from 'lucide-react';
import { Event } from '../../../../../types/event';

interface EventCalendarViewProps {
  events: Event[];
  onDateSelect: (date: Date) => void;
}

const EventCalendarView: React.FC<EventCalendarViewProps> = ({ events, onDateSelect }) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = new Date(event.date).toDateString();
    acc[date] = [...(acc[date] || []), event];
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-6 h-6 text-purple-400" />
        <h3 className="text-xl font-bold text-white">Event Calendar</h3>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-gray-400 text-sm py-2">
            {day}
          </div>
        ))}
        
        {/* Calendar grid would be populated here */}
        {/* This is a simplified version - you'd want to use a proper calendar library in production */}
      </div>

      <div className="mt-4">
        <h4 className="text-white font-semibold mb-2">Upcoming Events</h4>
        {Object.entries(eventsByDate).map(([date, dateEvents]) => (
          <div key={date} className="mb-4">
            <div className="text-purple-400 text-sm mb-2">{date}</div>
            {dateEvents.map((event) => (
              <div
                key={event._id}
                className="bg-purple-500/20 border border-purple-500/50 rounded-md p-2 mb-2 text-sm cursor-pointer hover:bg-purple-500/30 transition-colors"
                onClick={() => onDateSelect(new Date(event.date))}
              >
                <div className="font-medium text-white">{event.title}</div>
                <div className="text-xs text-gray-300">
                  {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventCalendarView;