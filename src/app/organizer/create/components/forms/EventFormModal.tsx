import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader } from "lucide-react";
import { ErrorBoundary } from "../../utils/ErrorBoundary";
import dynamic from 'next/dynamic';
import { Event } from "@/types/event"; // Import Event type

// Dynamically import EventForm to reduce initial load time
const EventForm = dynamic(
  () => import('./EventForm'),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl w-full max-w-3xl p-8 flex items-center justify-center">
          <Loader className="w-8 h-8 text-purple-500 animate-spin" />
          <span className="ml-3 text-white">Loading form...</span>
        </div>
      </div>
    ),
    ssr: false
  }
);

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

export function EventFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
}: EventFormModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-800 rounded-xl w-full max-w-3xl p-6 relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
              aria-label="Close form"
            >
              <X className="w-5 h-5" />
            </button>
            <ErrorBoundary 
              fallback={
                <div className="p-8 text-center">
                  <AlertTriangle className="text-red-500 h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-xl text-white mb-2">Failed to load event form</h3>
                  <p className="text-gray-400 mb-4">There was an error loading the form component</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all"
                  >
                    Refresh Page
                  </button>
                </div>
              }
              onError={(error) => console.error("Error in event form:", error)}
            >
              <EventForm 
                onClose={onClose} 
                onSubmit={onSubmit} 
              />
            </ErrorBoundary>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 