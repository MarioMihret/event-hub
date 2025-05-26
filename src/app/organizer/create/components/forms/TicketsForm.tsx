import React, { useState, useEffect } from 'react';
import { TicketsFormProps } from '../../types';
import { CheckCircle, AlertCircle } from 'lucide-react';

const TicketsForm: React.FC<TicketsFormProps> = ({
  event,
  onEventChange,
  formErrors,
  fieldsTouched,
  validateFieldOnBlur,
  setHasChanges,
  validateField,
  getFullValidationData,
  setFormErrors
}) => {
  // Track if this is a free event, initialize from event state
  const [isFreeEvent, setIsFreeEvent] = useState<boolean>(
    event.isFreeEvent !== undefined ? event.isFreeEvent : true // Default to true if undefined
  );

  // Create a change handler that updates the event state and marks changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let updatedValue: string | number | undefined = value;

    // Handle numeric inputs properly
    if (type === 'number') {
      updatedValue = value === '' ? undefined : parseFloat(value); // Use undefined for empty number fields?
    } else if (name === 'earlyBirdDeadline' && value === '') {
        updatedValue = undefined; // Explicitly set to undefined if date is cleared
    }

    onEventChange({
      ...event,
      [name]: updatedValue
    });
    setHasChanges(true); // Mark changes

    // Trigger validation for related fields if needed (e.g., price depends on isFreeEvent)
    if (name === 'price') {
        validateField('price', getFullValidationData());
    }
  };

  // When the free/paid selection changes, update the price and state
  useEffect(() => {
    if (isFreeEvent) {
      if (event.price !== 0 && event.price !== undefined) {
          onEventChange({ ...event, price: undefined, isFreeEvent: true });
          setHasChanges(true);
          // Clear price errors when switching to free
          setFormErrors(prev => { 
             const next = {...prev}; 
             delete next['price']; 
             return next; 
          });
      }
    } else {
        // If switching to paid and price is 0 or undefined, maybe clear it or leave as is?
        // If price is 0, it will likely fail validation on blur/next step
        if (event.isFreeEvent !== false) {
            onEventChange({ ...event, isFreeEvent: false });
            setHasChanges(true);
        }
    }
  }, [isFreeEvent, event, onEventChange, setHasChanges, setFormErrors]); // Added dependencies

  // Helper to determine if field should show error
  const shouldShowError = (fieldName: keyof typeof formErrors): boolean => {
    return !!(fieldsTouched?.[fieldName] && formErrors[fieldName]);
  };

  // Helper for providing input status classes
  const getInputClasses = (fieldName: string) => {
    const baseClasses = "w-full bg-gray-700 border rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none transition-colors";
    
    if (shouldShowError(fieldName as keyof typeof formErrors)) {
      return `${baseClasses} border-red-500`;
    } else if (fieldsTouched?.[fieldName] && !formErrors[fieldName as keyof typeof formErrors]) {
      return `${baseClasses} border-green-500`;
    }
    return `${baseClasses} border-gray-600`;
  };

  // Toggle between free and paid event
  const handlePricingTypeChange = (isPaid: boolean) => {
    const nowFree = !isPaid;
    setIsFreeEvent(nowFree);
    // Update event state immediately
    onEventChange({
        ...event,
        isFreeEvent: nowFree,
        // Clear price only if changing TO free
        ...(nowFree && { price: undefined }) 
    });
    setHasChanges(true);
    // Validate price immediately when switching to paid
    if (isPaid) {
        validateField('price', { ...getFullValidationData(), isFreeEvent: false });
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
        Pricing & Tickets
      </h3>

      <div className="mb-6">
        <label className="block text-gray-300 mb-3">Event Pricing Type *</label>
        <div className="flex flex-col md:flex-row gap-3">
          <div 
            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              isFreeEvent 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onClick={() => handlePricingTypeChange(false)}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              isFreeEvent ? 'bg-green-500' : 'border border-gray-500'
            }`}>
              {isFreeEvent && <CheckCircle className="w-4 h-4 text-white" />}
            </div>
            <div>
              <p className="font-medium text-white">Free Event</p>
              <p className="text-sm text-gray-400">No payment required from attendees</p>
            </div>
          </div>

          <div 
            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              !isFreeEvent 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onClick={() => handlePricingTypeChange(true)}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              !isFreeEvent ? 'bg-green-500' : 'border border-gray-500'
            }`}>
              {!isFreeEvent && <CheckCircle className="w-4 h-4 text-white" />}
            </div>
            <div>
              <p className="font-medium text-white">Paid Event</p>
              <p className="text-sm text-gray-400">Charge attendees for tickets</p>
            </div>
          </div>
        </div>
      </div>

      {!isFreeEvent && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-300 mb-2">Ticket Price *</label>
            <input
              name="price"
              type="number"
              value={event.price ?? ''} // Use empty string if undefined/null for input
              onChange={handleChange}
              onBlur={() => validateFieldOnBlur('price')}
              className={getInputClasses('price')}
              placeholder="e.g., 10.00"
              min="0.01"
              step="0.01"
              required={!isFreeEvent}
              disabled={isFreeEvent}
            />
            {shouldShowError('price') && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {formErrors.price}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">Set the amount attendees will pay</p>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Currency</label>
            <select
              name="currency"
              value={event.currency || 'USD'}
              onChange={handleChange}
              onBlur={() => validateFieldOnBlur('currency')}
              className={getInputClasses('currency')}
              disabled={isFreeEvent}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="ETB">ETB</option>
            </select>
            {shouldShowError('currency') && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {formErrors.currency}
              </p>
            )}
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Early Bird Deadline <span className="text-gray-500 text-xs">(optional)</span></label>
            <input
              name="earlyBirdDeadline"
              type="date"
              value={event.earlyBirdDeadline || ''}
              onChange={handleChange}
              onBlur={() => validateFieldOnBlur('earlyBirdDeadline')}
              className={getInputClasses('earlyBirdDeadline')}
              disabled={isFreeEvent}
            />
            {shouldShowError('earlyBirdDeadline') && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {formErrors.earlyBirdDeadline}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">Use YYYY-MM-DD format (must be before event date)</p>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Refund Policy <span className="text-gray-500 text-xs">(optional)</span></label>
            <select
              name="refundPolicy"
              value={event.refundPolicy || ''}
              onChange={handleChange}
              onBlur={() => validateFieldOnBlur('refundPolicy')}
              className={getInputClasses('refundPolicy')}
              disabled={isFreeEvent}
            >
              <option value="">Select policy</option>
              <option value="FULL">Full refund</option>
              <option value="PARTIAL">Partial refund</option>
              <option value="NONE">No refund</option>
            </select>
            {shouldShowError('refundPolicy') && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {formErrors.refundPolicy}
              </p>
            )}
          </div>
        </div>
      )}

      {isFreeEvent && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-300">This event will be free for all attendees.</p>
          <p className="text-sm text-gray-400 mt-1">Attendees will still need to register for tickets, but no payment will be required.</p>
        </div>
      )}
    </div>
  );
};

export default TicketsForm; 