import { useState, useCallback } from 'react';
import { FormState, VisibilityStatus } from '../types';
import { eventFormSchema, formatZodErrors, EventFormData } from '@/lib/validations/eventSchema';
import { z } from 'zod';
import debounce from 'lodash/debounce';

// Interface defining the full data structure needed for validation
// Export this interface for use in components
export interface FullValidationData extends EventFormData {
    title: string; // Keep title separate if it's managed separately in EventForm state
    roomName?: string | null; // Added for Jitsi virtual events
    // Add other top-level state fields if they are part of the form data but not in FormState
    // e.g., if tags, requirements, targetAudience are separate useState
    // tags: string[]; 
    // requirements: string[];
    // targetAudience: string[];
}

export const useFormValidation = () => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [fieldsTouched, setFieldsTouched] = useState<Record<string, boolean>>({});

  // Mark a field as touched
  const markFieldAsTouched = useCallback((fieldName: string) => {
    setFieldsTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
  }, []);

  // Reset touched state
  const resetTouchedState = useCallback(() => {
    setFieldsTouched({});
  }, []);

  // Clear form errors for a specific field or all fields
  const clearErrors = useCallback((field?: string) => {
    if (field) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        // Also clear related nested errors if applicable (e.g., speakers.0.name -> clear speakers)
        // This might need more sophisticated logic depending on error display needs
        return newErrors;
      });
    } else {
      setFormErrors({});
    }
  }, []);

  // Function to validate the entire form data using the Zod schema
  const validateForm = useCallback((data: FullValidationData): boolean => {
    const result = eventFormSchema.safeParse(data);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      setFormErrors(formatted);
      console.log("Zod Validation Errors:", formatted);
      return false;
    }
    setFormErrors({}); // Clear errors on successful validation
    return true;
  }, []);

  // Function to validate a single field using the Zod schema
  // Returns error message string if invalid for this field, null otherwise.
  const validateField = useCallback((fieldName: keyof FullValidationData, data: FullValidationData): string | null => {
    console.log(`[validateField] Validating field: "${String(fieldName)}" with data:`, JSON.stringify(data).substring(0, 500) + '...'); 

    const result = eventFormSchema.safeParse(data); 

    console.log(`[validateField] Zod safeParse result for field "${String(fieldName)}": success=${result.success}`); 

    if (!result.success) {
         console.log(`[validateField] Zod safeParse failed. Error issues:`, JSON.stringify(result.error.issues));

        const fieldError = result.error.issues.find(issue =>
            issue.path.includes(fieldName) 
        );

        if (fieldError) {
            console.log(`[validateField] Found error for "${String(fieldName)}": Path=[${fieldError.path.join(', ')}], Message="${fieldError.message}". Returning error message.`);
            // Return the error message instead of setting state
            return fieldError.message;
        } else {
            // Overall schema failed, but not because of *this* specific field.
            console.log(`[validateField] Schema parse failed overall, but no specific error found for path including "${String(fieldName)}". Returning null.`);
             // Return null as this specific field is considered valid in this context.
            return null;
        }
    } else {
        // Overall schema validation successful
        console.log(`[validateField] Zod validation successful for "${String(fieldName)}". Returning null.`);
         // Return null as the field is valid.
        return null;
    }
}, [eventFormSchema]); // Removed setFormErrors from dependencies

  // Debounced version of single field validation that updates formErrors state
  const validateFieldWithDebounce = useCallback(
    debounce((fieldName: keyof FullValidationData, data: FullValidationData) => {
        const errorMessage = validateField(fieldName, data);
        setFormErrors(prevErrors => {
            const newErrors = { ...prevErrors };
            if (errorMessage) {
                // Set the error message if validation failed for this field
                newErrors[fieldName] = errorMessage;
            } else {
                // Clear the error message if validation passed for this field
                delete newErrors[fieldName];
            }
            return newErrors;
        });
    }, 500), 
    [validateField, setFormErrors] // Added setFormErrors dependency
  );

  // --- Legacy functions (to be removed or adapted) --- 
  // These are now handled by the Zod schema and validateForm/validateField

  /*
  const validateDateTime = useCallback((date: string, startTime: string, endTime: string) => {
    // Logic now in eventFormSchema.refine(refineEventTimes)
    console.warn("validateDateTime is deprecated, use validateField or validateForm with Zod schema");
    return true; // Placeholder
  }, []);
  */

  // No need for custom isDateInFuture, isValidDateString, isValidTimeString, sanitizeInput, etc.
  // Zod handles parsing, validation, and refinement.

  return {
    formErrors,
    setFormErrors, // Export setFormErrors for use in components
    fieldsTouched,
    validateForm,
    validateField,
    validateFieldWithDebounce, 
    clearErrors,
    markFieldAsTouched,
    resetTouchedState
    // Removed validateDateTime as it's integrated into the schema
  };
};

export default useFormValidation; 