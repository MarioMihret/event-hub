"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface EnterpriseInquiryFormProps {
  onSuccess?: () => void; // Optional callback on successful submission
}

export default function EnterpriseInquiryForm({ onSuccess }: EnterpriseInquiryFormProps) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    companyName: '',
    email: session?.user?.email || '', // Pre-fill if possible
    phone: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null); // Clear error on change
    setSuccessMessage(null); // Clear success message on change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!session?.user?.id) {
      setError("You must be logged in to submit an inquiry.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/subscriptions/enterprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // Note: userId is added server-side based on session in the API route
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message || 'Inquiry submitted successfully!');
        toast.success('Inquiry submitted successfully!');
        // Clear form
        setFormData({
          companyName: '',
          email: session?.user?.email || '', // Reset email pre-fill
          phone: '',
          message: ''
        });
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(data.error || 'Failed to submit inquiry. Please try again.');
        toast.error(data.error || 'Failed to submit inquiry.');
      }
    } catch (err) {
      console.error("Error submitting enterprise inquiry:", err);
      setError('An unexpected error occurred. Please try again later.');
      toast.error('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm">
          {successMessage}
        </div>
      )}
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-1">Company Name</label>
        <input
          id="companyName"
          name="companyName"
          type="text"
          value={formData.companyName}
          onChange={handleChange}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Your Company Inc."
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Contact Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500"
          placeholder="you@company.com"
        />
      </div>
      
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">Contact Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500"
          placeholder="+251 ..."
        />
      </div>
      
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">Message / Requirements</label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={5}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Tell us about your organization's event needs, expected volume, custom requirements, etc..."
        />
      </div>
      
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-medium shadow-md disabled:opacity-60 disabled:cursor-wait transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Submitting...
            </>
          ) : (
            'Submit Inquiry'
          )}
        </button>
      </div>
    </form>
  );
} 