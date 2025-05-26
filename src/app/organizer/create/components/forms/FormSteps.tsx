import React from 'react';
import { Info, Target, MapPin, DollarSign, Image as ImageIcon, Users, Check, Send, Eye } from 'lucide-react';

// Import the centralized FormStep type
import { FormStep } from '../../types';

// Remove the local definition
// export type FormStep = 'basic' | 'details' | 'location' | 'tickets' | 'images' | 'speakers' | 'submit';

// Interface now expects the steps array as a prop
interface FormStepsProps {
  currentStep: FormStep;
  steps: { id: FormStep; name: string; icon?: React.ComponentType<{ className?: string }> }[];
}

// Map step IDs to icons (can be customized further)
const stepIconMap: Record<FormStep, React.ComponentType<{ className?: string }>> = {
  basic: Info,
  details: Target,
  location: MapPin,
  tickets: DollarSign,
  images: ImageIcon,
  speakers: Users,
  review: Eye, // Added icon for review
};

const FormSteps: React.FC<FormStepsProps> = ({ currentStep, steps }) => {
  // Use the passed steps array
  const stepsWithIcons = steps.map(step => ({
    ...step,
    icon: step.icon || stepIconMap[step.id] || Info // Use provided icon, mapped icon, or default
  }));

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between overflow-x-auto pb-2 space-x-2 md:space-x-0">
        {stepsWithIcons.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          // Find the current step index in the passed steps array
          const currentStepIndex = stepsWithIcons.findIndex(s => s.id === currentStep);
          const isCompleted = currentStepIndex > index;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`flex flex-col items-center flex-shrink-0 text-center w-20 md:w-auto ${isActive ? 'text-purple-400' : isCompleted ? 'text-green-400' : 'text-gray-500'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                  isActive ? 'border-purple-500 bg-purple-900/30' :
                  isCompleted ? 'border-green-600 bg-green-900/30' :
                  'border-gray-700 bg-gray-800/50'
                }`}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                {/* Use step.name which comes from the prop */}
                <span className="mt-2 text-xs md:text-sm font-medium break-words">{step.name}</span>
              </div>
              {index < stepsWithIcons.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 md:mx-2 transition-colors duration-300 ${
                  isCompleted ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gray-700'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default FormSteps; 