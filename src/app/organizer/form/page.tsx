// app/form/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LoadingState from "@/components/organizer/LoadingState";
import SuccessMessage from "@/components/organizer/SuccessMessage";
// It's good practice to have a dedicated error component, but for a quick fix:
// import PageLevelErrorDisplay from "@/components/organizer/PageLevelErrorDisplay"; 
import FormContainer from "./components/FormContainer";
import useFormState, { FormData as OrganizerFormData } from "../form/hooks/useFormState";
import useApplicationCheck, { ApplicationCheckStatus } from "./hooks/useApplicationCheck"; // Import interface
import useFormSubmission from "./hooks/useFormSubmission";

const OrganizerApplication = () => {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { 
    formData, 
    formErrors, 
    currentStep, 
    totalSteps,
    progressPercentage,
    handleChange, 
    handleSelectChange, 
    handleSkillsChange, 
    handleFileChange,
    setFormErrors,
    validateCurrentStep,
    handleNext,
    handlePrevious
  }: {
    formData: OrganizerFormData;
    formErrors: string[];
    currentStep: number;
    totalSteps: number;
    progressPercentage: number;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleSelectChange: (name: string, value: string) => void;
    handleSkillsChange: (skill: string) => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, fileType: 'idDocument' | 'profilePhoto') => void;
    setFormErrors: React.Dispatch<React.SetStateAction<string[]>>;
    validateCurrentStep: () => string[];
    handleNext: () => void;
    handlePrevious: () => void;
  } = useFormState();

  // Destructure all relevant properties from useApplicationCheck
  const appCheck: ApplicationCheckStatus = useApplicationCheck(session, authStatus, router);

  const { 
    isSubmitting, 
    showSuccess, 
    timeLeft,
    handleSubmit, 
    submissionStatus
  } = useFormSubmission(
    formData, 
    currentStep,
    session, 
    validateCurrentStep, 
    setFormErrors, 
    router
  );

  if (showSuccess) {
    return <SuccessMessage />;
  }

  // Authentication loading state
  if (authStatus === 'loading') {
    return <LoadingState message={"Authenticating session..."} />;
  }

  // Application check loading state
  if (appCheck.isChecking) {
    return <LoadingState message={appCheck.status || "Checking application status..."} />;
  }

  // Application check error state
  if (appCheck.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black to-[#120a19] text-white p-6">
        <div className="bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl border border-red-500/50 shadow-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Application Error</h2>
          <p className="text-gray-300 mb-6">
            There was an issue checking your application status: {appCheck.error}
          </p>
          <button 
            onClick={() => router.refresh()} // Simple retry by refreshing the page
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If no loading states and no app check error, render the form
  return (
    <FormContainer
      formData={formData}
      formErrors={formErrors}
      apiError={submissionStatus?.error}
      currentStep={currentStep}
      totalSteps={totalSteps}
      progressPercentage={progressPercentage}
      isSubmitting={isSubmitting}
      timeLeft={timeLeft}
      handleChange={handleChange}
      handleSelectChange={handleSelectChange}
      handleSkillsChange={handleSkillsChange}
      handleFileChange={handleFileChange}
      handleSubmit={handleSubmit}
      handleNext={handleNext}
      handlePrevious={handlePrevious}
    />
  );
};

export default OrganizerApplication;