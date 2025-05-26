import { useState } from 'react';
import { AlertTriangle, RefreshCw, ChevronLeft, Info } from 'lucide-react';

interface ErrorScreenProps {
  error: string;
  onRetry?: () => void;
  onBack?: () => void;
  title?: string;
  showRefresh?: boolean;
}

/**
 * Error screen component for displaying error messages with retry options
 */
export function ErrorScreen({ 
  error, 
  onRetry, 
  onBack, 
  title = "Dashboard Loading Error",
  showRefresh = true
}: ErrorScreenProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Format the error for display
  const errorMessage = typeof error === 'string' ? error : 'An unexpected error occurred';
  const errorDetails = typeof error === 'object' ? JSON.stringify(error, null, 2) : error;
  
  // Handle retry action - with temporary visual feedback
  const handleRetry = async () => {
    setIsRetrying(true);
    
    try {
      // Call onRetry if provided
      if (onRetry) {
        await onRetry();
      } 
      // Otherwise just reload the page after a short delay
      else if (showRefresh) {
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (e) {
      console.error('Error during retry:', e);
    } finally {
      // Reset retry state after a short delay to show loading state
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black p-4">
      <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-md p-8 rounded-xl border border-gray-700 text-center">
        <div className="bg-red-500/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="text-red-500 h-9 w-9" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-3">{title}</h1>
        <p className="text-gray-300 mb-4">{errorMessage}</p>
        
        {/* Collapsible error details for debugging */}
        <div className="mb-6">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-400 hover:text-gray-300 flex items-center gap-1 mx-auto"
            aria-expanded={showDetails}
            aria-controls="error-details-content"
          >
            <Info className="h-3 w-3" />
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
          
          {showDetails && (
            <div 
              id="error-details-content"
              className="mt-2 p-3 bg-gray-900 rounded text-left overflow-auto max-h-40"
            >
              <pre className="text-xs text-gray-400 whitespace-pre-wrap">{errorDetails}</pre>
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {showRefresh && (
            <button
              onClick={handleRetry}
              className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300 font-medium disabled:opacity-70 flex items-center justify-center gap-2"
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Retrying...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  <span>Retry</span>
                </>
              )}
            </button>
          )}
          
          {onBack && (
            <button
              onClick={onBack}
              className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-all duration-300 font-medium flex items-center justify-center gap-2"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Go Back</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 