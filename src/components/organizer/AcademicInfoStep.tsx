import React from 'react';
import { BookOpen, Building, GraduationCap, IdCard } from 'lucide-react';
import { motion } from 'framer-motion';

interface AcademicInfoStepProps {
  formData: {
    university: string;
    department: string;
    role: string;
    yearOfStudy: string;
    studentId: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
}

const AcademicInfoStep: React.FC<AcademicInfoStepProps> = ({ 
  formData, 
  handleChange, 
  handleSelectChange 
}) => {

  const handleRoleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, roleValue: string) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault(); // Prevent scrolling if space is pressed
      handleSelectChange("role", roleValue);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
        Academic <span className="text-[#b967ff]">Information</span>
      </h3>
      
      <div className="space-y-6 bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl p-6 border border-[#b967ff]/20 shadow-lg">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <label htmlFor="university" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Building className="h-4 w-4 text-[#b967ff]" />
            University
          </label>
          <select 
            id="university"
            value={formData.university} 
            onChange={(e) => handleSelectChange("university", e.target.value)}
            className="w-full py-3 px-4 bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white transition-all"
          >
            <option value="">Select your university</option>
            <option value="Woldiya University">Woldiya University</option>
            <option value="Addis Ababa University">Addis Ababa University</option>
            <option value="Bahir Dar University">Bahir Dar University</option>
            <option value="Jimma University">Jimma University</option>
            <option value="Hawassa University">Hawassa University</option>
            <option value="Mekelle University">Mekelle University</option>
            <option value="Gondar University">Gondar University</option>
            <option value="Arba Minch University">Arba Minch University</option>
          </select>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <label htmlFor="department" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#b967ff]" />
            Department/Faculty
          </label>
          <input 
            id="department" 
            name="department" 
            value={formData.department} 
            onChange={handleChange} 
            placeholder="e.g., Computer Science, Engineering, Medicine" 
            className="w-full py-3 px-4 bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white transition-all"
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <label className="block text-sm font-medium text-gray-300 mb-2">Role at University</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              role="radio"
              aria-checked={formData.role === "student"}
              tabIndex={0}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                formData.role === "student" 
                  ? 'border-[#b967ff] bg-[#b967ff]/10' 
                  : 'border-[#2D1B3D] hover:border-[#b967ff]/30 bg-[#2D1B3D]/50'
              }`}
              onClick={() => handleSelectChange("role", "student")}
              onKeyDown={(e) => handleRoleKeyDown(e, "student")}
            >
              <input 
                type="radio" 
                id="student" 
                name="role" 
                value="student" 
                checked={formData.role === "student"} 
                onChange={(e) => handleSelectChange("role", e.target.value)}
                className="h-4 w-4 text-[#b967ff] focus:ring-[#b967ff] hidden"
              />
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                  formData.role === "student" 
                    ? 'border-[#b967ff]' 
                    : 'border-gray-500'
                }`}>
                  {formData.role === "student" && (
                    <div className="w-3 h-3 rounded-full bg-[#b967ff]"></div>
                  )}
                </div>
                <label htmlFor="student" className="text-sm cursor-pointer text-gray-300">Student</label>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              role="radio"
              aria-checked={formData.role === "staff"}
              tabIndex={0}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                formData.role === "staff" 
                  ? 'border-[#b967ff] bg-[#b967ff]/10' 
                  : 'border-[#2D1B3D] hover:border-[#b967ff]/30 bg-[#2D1B3D]/50'
              }`}
              onClick={() => handleSelectChange("role", "staff")}
              onKeyDown={(e) => handleRoleKeyDown(e, "staff")}
            >
              <input 
                type="radio" 
                id="staff" 
                name="role" 
                value="staff" 
                checked={formData.role === "staff"} 
                onChange={(e) => handleSelectChange("role", e.target.value)}
                className="h-4 w-4 text-[#b967ff] focus:ring-[#b967ff] hidden"
              />
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                  formData.role === "staff" 
                    ? 'border-[#b967ff]' 
                    : 'border-gray-500'
                }`}>
                  {formData.role === "staff" && (
                    <div className="w-3 h-3 rounded-full bg-[#b967ff]"></div>
                  )}
                </div>
                <label htmlFor="staff" className="text-sm cursor-pointer text-gray-300">Staff</label>
              </div>
            </motion.div>
          </div>
        </motion.div>
        
        {formData.role === "student" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <label htmlFor="yearOfStudy" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[#b967ff]" />
                Year of Study
              </label>
              <select 
                id="yearOfStudy"
                name="yearOfStudy"
                value={formData.yearOfStudy} 
                onChange={handleChange}
                className="w-full py-3 px-4 bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white transition-all"
              >
                <option value="">Select year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
                <option value="5">5th Year</option>
                <option value="6">6th Year</option>
                <option value="graduate">Graduate Student</option>
              </select>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                <IdCard className="h-4 w-4 text-[#b967ff]" />
                Student ID Number
              </label>
              <input 
                id="studentId" 
                name="studentId" 
                value={formData.studentId} 
                onChange={handleChange} 
                placeholder="Enter your student ID number" 
                className="w-full py-3 px-4 bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white transition-all"
              />
            </motion.div>
          </motion.div>
        )}
      </div>
      
      {formData.role === "staff" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-start p-4 bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl border border-[#b967ff]/20 shadow-lg"
        >
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex-shrink-0 mr-4">
            <Building className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-300">
            As a staff member, you'll have additional responsibilities and privileges in organizing events.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AcademicInfoStep;