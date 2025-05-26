// app/form/hooks/useFormSubmission.ts
"use client";

import { useState, useEffect } from "react";
import { Session } from "next-auth";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface FormData {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  university: string;
  department: string;
  role: string;
  yearOfStudy: string;
  studentId: string;
  experience: string;
  reason: string;
  skills: string[];
  availability: string;
  termsAccepted: boolean;
  newsletterSubscription: boolean;
  idDocument: string | null;
  idPreview: string;
  profilePhoto: string | null;
  profilePhotoPreview: string;
}

export default function useFormSubmission(
  formData: FormData,
  currentStep: number,
  session: Session | null,
  validateCurrentStep: () => string[],
  setFormErrors: React.Dispatch<React.SetStateAction<string[]>>,
  router: AppRouterInstance
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<{ success: boolean; error: string | null; applicationId?: string }>({
    success: false,
    error: null,
  });

  useEffect(() => {
    if (isSubmitting) {
      setTimeLeft(3);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const stepErrors = validateCurrentStep();
    if (stepErrors.length > 0) {
      setFormErrors(stepErrors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors([]);
    setSubmissionStatus({ success: false, error: null });

    try {
      const { idPreview, profilePhotoPreview, ...restOfFormData } = formData;
      const submissionData = {
        ...restOfFormData,
        email: session?.user?.email,
      };

      console.log("Submitting application data...");
      const response = await fetch("/api/organizer-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();
      console.log("Submission response:", data);

      if (!response.ok) {
        const errorMessage = data.error || `Failed to submit application (Status: ${response.status})`;
        setSubmissionStatus({ success: false, error: errorMessage });
        setFormErrors(prevErrors => [...prevErrors, errorMessage]);
        return;
      }

      if (data.success && data.data?.applicationId) {
        console.log("Application submitted successfully. ID:", data.data.applicationId);
        
        localStorage.setItem("applicationId", data.data.applicationId);
        localStorage.setItem("applicationStatus", data.data.status || "pending");
        
        const applicationData = {
          applicationId: data.data.applicationId,
          status: data.data.status || "pending",
          email: session?.user?.email,
          fullName: formData.fullName,
          submittedAt: new Date().toISOString()
        };
        localStorage.setItem("organizer_application", JSON.stringify(applicationData));
        
        setSubmissionStatus({ success: true, error: null, applicationId: data.data.applicationId });
        setShowSuccess(true);
        localStorage.removeItem('organizerFormData');

        setTimeout(() => {
          console.log("Redirecting to status page...");
          router.push(`/organizer/status/${data.data.applicationId}`);
        }, 3000);
      } else {
        const errorMessage = data.error || data.message || "Invalid response from server";
        setSubmissionStatus({ success: false, error: errorMessage });
        setFormErrors(prevErrors => [...prevErrors, errorMessage]);
        return;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
      setSubmissionStatus({ success: false, error: errorMessage });
      setFormErrors([errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    showSuccess,
    timeLeft,
    handleSubmit,
    submissionStatus
  };
}