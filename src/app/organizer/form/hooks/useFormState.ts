"use client";

import { useState, useEffect } from "react";
import { 
  getApplicationStatus, 
  getApplicationId, 
  getApplicationFeedback, 
  clearApplicationData, 
  canSubmitNewApplication,
} from '@/lib/utils/applicationUtils';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

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

export default function useFormState() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const totalSteps = 4;
  const progressPercentage = (currentStep / totalSteps) * 100;



  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    university: "",
    department: "",
    role: "student",
    yearOfStudy: "",
    studentId: "",
    experience: "no",
    reason: "",
    skills: [],
    availability: "weekends",
    termsAccepted: false,
    newsletterSubscription: false,
    idDocument: null, // Explicitly set to null
    idPreview: "",
    profilePhoto: null, // Explicitly set to null
    profilePhotoPreview: "",
  });

  useEffect(() => {
    // Only clear form and application data if a new application can be submitted
    if (canSubmitNewApplication()) {
      localStorage.removeItem('organizerFormData');
      clearApplicationData();

      setFormData({
        fullName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        university: "",
        department: "",
        role: "student",
        yearOfStudy: "",
        studentId: "",
        experience: "no",
        reason: "",
        skills: [],
        availability: "weekends",
        termsAccepted: false,
        newsletterSubscription: false,
        idDocument: null,
        idPreview: "",
        profilePhoto: null,
        profilePhotoPreview: "",
      });
    }
    // IMPORTANT: If `canSubmitNewApplication()` relies on asynchronous data (e.g., session status)
    // that might not be available on initial mount, this useEffect's dependency array `[]` might be insufficient.
    // You may need to add dependencies that cause `canSubmitNewApplication()` to re-evaluate, 
    // or `canSubmitNewApplication` itself if it's stable after its data loads.
    // For example: `}, [sessionStatus, otherAsyncDataLoaded]);` or `}, [canSubmitNewApplicationResult]);`
  }, []); // User to verify dependencies based on `canSubmitNewApplication` behavior.

  useEffect(() => {
    const saveFormData = () => {
      // Only save form data if user can submit a new application
      if (canSubmitNewApplication()) {
        const dataToSave = { ...formData };
        
        // Create a new object without the file properties and preview properties
        const dataToStore = Object.fromEntries(
          Object.entries(dataToSave).filter(([key]) => 
            key !== 'idDocument' && 
            key !== 'profilePhoto' &&
            key !== 'idPreview' &&         // Do not save idPreview to localStorage
            key !== 'profilePhotoPreview'  // Do not save profilePhotoPreview to localStorage
          )
        );
        
        localStorage.setItem('organizerFormData', JSON.stringify(dataToStore));
      }
    };

    saveFormData();
  }, [formData]);

  useEffect(() => {
    // Only load saved form data if user can submit a new application
    // Note: idPreview and profilePhotoPreview are not loaded from localStorage as they are not saved.
    // They will be regenerated if files are re-selected.
    if (canSubmitNewApplication()) {
      const savedData = localStorage.getItem('organizerFormData');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setFormData(prev => ({
            ...prev,
            ...parsedData,
            idDocument: null, // Always reset file inputs
            profilePhoto: null, // Always reset file inputs
            idPreview: "", // Ensure previews are reset as they are not loaded
            profilePhotoPreview: "", // Ensure previews are reset as they are not loaded
          }));
        } catch (e) {
          console.error("Error loading saved form data:", e);
        }
      }
    }
    // IMPORTANT: Similar to the effect above, if `canSubmitNewApplication()` relies on asynchronous data,
    // this useEffect's dependency array `[]` might be insufficient. Review and add necessary dependencies.
    // For example: `}, [sessionStatus, otherAsyncDataLoaded]);` or `}, [canSubmitNewApplicationResult]);`
  }, []); // User to verify dependencies based on `canSubmitNewApplication` behavior.

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
  
    const target = e.target as HTMLInputElement;
    if (target.type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSkillsChange = (skill: string) => {
    setFormData((prev) => {
      const updatedSkills = prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill];
      
      return {
        ...prev,
        skills: updatedSkills
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'idDocument' | 'profilePhoto') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (max 5MB)
      if (file.size > MAX_FILE_SIZE_BYTES) { // Use the constant
        setFormErrors([`${fileType === 'idDocument' ? 'ID document' : 'Profile photo'} must be less than ${(MAX_FILE_SIZE_BYTES / (1024*1024)).toFixed(0)}MB`]);
        // Clear the file input by resetting its value if possible
        e.target.value = ""; 
        // Also clear the corresponding state for the file and its preview
        setFormData((prev) => ({
          ...prev,
          [fileType]: null,
          [fileType === 'idDocument' ? 'idPreview' : 'profilePhotoPreview']: "",
        }));
        return;
      }
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setFormErrors([`${fileType === 'idDocument' ? 'ID document' : 'Profile photo'} must be JPG, PNG, or PDF`]);
        return;
      }
      
      setFormErrors([]);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64String = event.target.result as string;
          setFormData((prev) => ({
            ...prev,
            [fileType]: base64String,
            [fileType === 'idDocument' ? 'idPreview' : 'profilePhotoPreview']: base64String,
          }));
        }
      };
      reader.readAsDataURL(file);
    } else {
      setFormData((prev) => ({
        ...prev,
        [fileType]: null,
        [fileType === 'idDocument' ? 'idPreview' : 'profilePhotoPreview']: "",
      }));
    }
  };

  const validateCurrentStep = (): string[] => {
    const errors: string[] = [];
    
    switch (currentStep) {
      case 1: // Personal Information
        if (!formData.fullName) errors.push("Full name is required");
        if (!formData.email) errors.push("Email is required");
        else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.push("Email is invalid");
        if (!formData.phone) errors.push("Phone number is required");
        if (!formData.dateOfBirth) errors.push("Date of birth is required");
        else {
          const birthDate = new Date(formData.dateOfBirth);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age < 18) {
            errors.push("You must be at least 18 years old to apply");
          }
        }
        break;
      case 2: // Academic Information
        if (!formData.university) errors.push("University is required");
        if (!formData.department) errors.push("Department is required");
        if (formData.role === "student" && !formData.yearOfStudy) errors.push("Year of study is required for students");
        if (formData.role === "student" && !formData.studentId) errors.push("Student ID is required");
        break;
      case 3: // Experience & Motivation
        if (!formData.reason || formData.reason.length < 50) 
          errors.push("Please provide a detailed reason (at least 50 characters)");
        if (formData.skills.length === 0)
          errors.push("Please select at least one skill");
        break;
      case 4: // ID Verification & Terms
        if (!formData.idDocument) errors.push("ID document upload is required");
        if (!formData.profilePhoto) errors.push("Profile photo is required");
        if (!formData.termsAccepted) errors.push("You must agree to the terms and conditions");
        break;
    }
    
    setFormErrors(errors);
    return errors;
  };

  const handleNext = () => {
    const errors = validateCurrentStep();
    if (errors.length === 0) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  return {
    formData,
    formErrors,
    currentStep,
    totalSteps,
    progressPercentage,
    setFormErrors,
    handleChange,
    handleSelectChange,
    handleSkillsChange,
    handleFileChange,
    validateCurrentStep,
    handleNext,
    handlePrevious,
    // Re-export the imported utility functions
    getApplicationStatus,
    getApplicationId,
    getApplicationFeedback,
    clearApplicationData,
    canSubmitNewApplication
  };
}