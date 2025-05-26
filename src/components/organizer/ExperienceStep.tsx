import React, { useEffect } from 'react';
import { FileText, Clock, Award, Target, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExperienceStepProps {
  formData: {
    experience: string;
    reason: string;
    skills: string[];
    availability: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleSkillsChange: (skill: string) => void;
}

const ExperienceStep: React.FC<ExperienceStepProps> = ({ 
  formData, 
  handleChange, 
  handleSelectChange,
  handleSkillsChange
}) => {
  const handleSkillKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, skill: string) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault(); // Prevent scrolling if space is pressed
      handleSkillsChange(skill);
    }
  };

  const skills = [
    "Event Planning",
    "Public Speaking",
    "Marketing",
    "Social Media",
    "Graphic Design",
    "Leadership",
    "Team Management",
    "Budgeting",
    "Technical Support",
    "Content Creation"
  ];
  
  // Template text for users with no experience
  const noExperienceTemplate = 
    "I don't have prior organizing experience, but I'm passionate about becoming an organizer because... [explain your motivation]\n\n" +
    "My relevant skills include... [describe any relevant skills]\n\n" +
    "I hope to contribute by... [explain what you hope to achieve as an organizer]";
  
  // Update reason field with template when experience changes to "no"
  useEffect(() => {
    if (formData.experience === "no" && formData.reason === "") {
      // Create a synthetic event to update the reason field
      const event = {
        target: {
          name: "reason",
          value: noExperienceTemplate
        }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      
      handleChange(event);
    }
  }, [formData.experience, formData.reason, handleChange]);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
        Experience & <span className="text-[#b967ff]">Motivation</span>
      </h3>
      
      <div className="space-y-6 bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl p-6 border border-[#b967ff]/20 shadow-lg">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <label htmlFor="experience" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Award className="h-4 w-4 text-[#b967ff]" />
            Past Experience
          </label>
          <select 
            id="experience"
            value={formData.experience} 
            onChange={(e) => handleSelectChange("experience", e.target.value)}
            className="w-full py-3 px-4 bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white transition-all"
          >
            <option value="no">No prior organizing experience</option>
            <option value="yes">Yes, I have organizing experience</option>
          </select>
        </motion.div>
        
        {formData.experience === "yes" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-[#b967ff]/10 rounded-lg border border-[#b967ff]/30"
          >
            <p className="text-sm text-[#b967ff] flex items-center gap-2">
              <Info className="h-4 w-4" />
              Great! Please describe your previous experience in the motivation section below.
            </p>
          </motion.div>
        )}
        
        {formData.experience === "no" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30"
          >
            <p className="text-sm text-blue-400 flex items-center gap-2">
              <Info className="h-4 w-4" />
              No problem! We've provided a template below to help you explain your motivation. Please edit it to personalize your response.
            </p>
          </motion.div>
        )}
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <label htmlFor="reason" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#b967ff]" />
            Why do you want to be an organizer?
            <span className="text-sm text-gray-400 ml-1">(min. 50 characters)</span>
          </label>
          <textarea 
            id="reason" 
            name="reason" 
            value={formData.reason} 
            onChange={handleChange} 
            placeholder="Please describe your motivation, relevant skills, and what you hope to contribute..." 
            className="w-full py-3 px-4 bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white transition-all min-h-[150px]"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formData.reason.length} / 50 characters minimum</span>
            <span className={formData.reason.length >= 50 ? "text-[#b967ff]" : "text-gray-400"}>
              {formData.reason.length >= 50 ? "✓ Minimum reached" : ""}
            </span>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Target className="h-4 w-4 text-[#b967ff]" />
            Skills (select all that apply)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {skills.map((skill, index) => (
              <motion.div 
                key={skill}
                role="checkbox"
                aria-checked={formData.skills.includes(skill)}
                tabIndex={0}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index + 0.3 }}
                className={`flex items-center p-3 border rounded-lg ${
                  formData.skills.includes(skill) 
                    ? 'border-[#b967ff] bg-[#b967ff]/10' 
                    : 'border-[#2D1B3D] hover:border-[#b967ff]/30 bg-[#2D1B3D]/50'
                } ${formData.experience === "no" ? 'cursor-pointer transition-all' : 'cursor-pointer transition-all'}`}
                onClick={() => handleSkillsChange(skill)}
                onKeyDown={(e) => handleSkillKeyDown(e, skill)}
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 ${
                  formData.skills.includes(skill) 
                    ? 'border-[#b967ff] bg-[#b967ff]' 
                    : 'border-gray-500'
                }`}>
                  {formData.skills.includes(skill) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-300">{skill}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <label htmlFor="availability" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#b967ff]" />
            Availability
          </label>
          <select 
            id="availability"
            value={formData.availability} 
            onChange={(e) => handleSelectChange("availability", e.target.value)}
            className="w-full py-3 px-4 bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white transition-all"
          >
            <option value="weekends">Weekends only</option>
            <option value="weekdays">Weekdays only</option>
            <option value="evenings">Evenings only</option>
            <option value="flexible">Flexible schedule</option>
            <option value="limited">Limited availability</option>
          </select>
        </motion.div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-start p-4 bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl border border-[#b967ff]/20 shadow-lg"
      >
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex-shrink-0 mr-4">
          <Target className="h-6 w-6" />
        </div>
        <p className="text-sm text-gray-300">
          Tip: Be specific about your skills and experiences. This helps us match you with the right organizing opportunities.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default ExperienceStep;