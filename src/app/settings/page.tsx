'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, User as UserIconLucide, Shield, Bell, Key, Save, UserCircle, Upload, ChevronRight, Check, AlertCircle, LogOut } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCopyToClipboard } from 'react-use';
import { UserAvatar } from '@/components/User/UserAvatar';
import type { User as NextAuthUser } from 'next-auth';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');
  const [userData, setUserData] = useState<NextAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  // Form states
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    eventReminders: true,
    marketingEmails: false,
  });

  // Image states
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);

  // Add state for password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordNotification, setPasswordNotification] = useState({ type: '', message: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const accountRef = useRef(null);
  const notificationsRef = useRef(null);
  const securityRef = useRef(null);
  const [state, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + 1/2/3 for tab switching
      if (e.altKey) {
        if (e.key === '1') {
          setActiveTab('account');
          accountRef.current?.focus();
        } else if (e.key === '2') {
          setActiveTab('notifications');
          notificationsRef.current?.focus();
        } else if (e.key === '3') {
          setActiveTab('security');
          securityRef.current?.focus();
        } else if (e.key === 's' && (activeTab === 'account' || activeTab === 'notifications')) {
          e.preventDefault();
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Handler for email copy
  const handleCopyEmail = () => {
    if (email) {
      copyToClipboard(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }

    if (session?.user?.email && status === 'authenticated') {
      fetchUserData();
    }
  }, [session, status, router]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const data = await response.json();
      setUserData(data.user as NextAuthUser);
      
      // Initialize form data
      setName(data.user.name || '');
      setBio(data.user.bio || '');
      setEmail(data.user.email || '');
      
      if (data.user.notificationSettings) {
        setNotificationSettings(data.user.notificationSettings);
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load your settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setNotification({
        type: 'error',
        message: 'Please select an image file'
      });
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setNotification({
        type: 'error',
        message: 'Image size should be less than 5MB'
      });
      return;
    }

    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imagePreview) return null;
    
    try {
      setUploadingImage(true);
      
      // In a real app, you would upload the image to a server or cloud storage
      // For now, we'll just return the data URL
      // This is just a simulation - in a real app, you'd use FormData and fetch to upload to a server
      
      // Simulate server delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return imagePreview;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setNotification({ type: '', message: '' });
      
      // Upload image if changed
      let uploadedImageUrl = null;
      if (imagePreview) {
        uploadedImageUrl = await uploadImage();
      }
      
      // Create update data object
      const updateData = {
        name,
        bio,
        notificationSettings,
        ...(uploadedImageUrl ? { image: uploadedImageUrl } : {})
      };
      
      // Send update request to the API
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
      
      // Get updated user data
      const data = await response.json();
      setUserData(data.user as NextAuthUser);
      setProfileVersion(prev => prev + 1);
      
      // Notify other components that the profile has been updated
      if (typeof window !== 'undefined') {
        // This will trigger the storage event listener in other tabs/components
        localStorage.setItem('profile_updated', Date.now().toString());
        // Also dispatch a custom event for components in the same tab
        window.dispatchEvent(new CustomEvent('profile_updated'));
      }
      
      setNotification({
        type: 'success',
        message: 'Settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to save settings'
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    try {
      // Reset notification
      setPasswordNotification({ type: '', message: '' });
      
      // Form validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordNotification({
          type: 'error',
          message: 'All fields are required'
        });
        return;
      }
      
      if (newPassword !== confirmPassword) {
        setPasswordNotification({
          type: 'error',
          message: 'New passwords do not match'
        });
        return;
      }
      
      if (newPassword.length < 8) {
        setPasswordNotification({
          type: 'error',
          message: 'Password must be at least 8 characters long'
        });
        return;
      }
      
      setChangingPassword(true);
      
      // Call API to change password
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setPasswordNotification({
        type: 'success',
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordNotification({
        type: 'error',
        message: error.message || 'Failed to change password'
      });
    } finally {
      setChangingPassword(false);
    }
  };
  
  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      
      // Call API to delete account
      const response = await fetch('/api/profile', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }
      
      // Sign out and redirect to home page
      signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Error deleting account:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to delete account'
      });
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-black via-[#1A0D25] to-black">
        <div className="w-12 h-12 border-4 border-[#b967ff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-screen bg-gradient-to-br from-black via-[#1A0D25] to-black text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="flex flex-col md:flex-row gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Sidebar */}
          <motion.div 
            className="w-full md:w-1/4"
            variants={itemVariants}
          >
            <div className="bg-[#120a19] p-4 rounded-xl border border-[#b967ff]/20 shadow-lg backdrop-blur-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center text-white">
                  <SettingsIcon className="mr-2 text-[#b967ff]" size={20} />
                  Settings
                </h2>
              </div>
              
              <div className="mb-6 flex items-center gap-3">
                {session?.user && (
                  <UserAvatar 
                    user={session.user} 
                    size="lg" 
                    showBorder={true}
                    refreshTrigger={profileVersion}
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-medium">{userData?.name || session?.user?.name}</h3>
                  <p className="text-sm text-gray-400">{userData?.email || session?.user?.email}</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                <button
                  ref={accountRef}
                  onClick={() => setActiveTab('account')}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'account' 
                      ? 'bg-[#2D1D3A] text-[#b967ff] shadow-lg shadow-[#b967ff]/10' 
                      : 'text-gray-300 hover:bg-[#1A0D25] hover:text-white'
                  }`}
                  aria-label="Account settings tab"
                  aria-selected={activeTab === 'account'}
                  aria-controls="account-panel"
                >
                  <div className="flex items-center">
                    <UserIconLucide size={18} className="mr-3" />
                    Account <span className="ml-2 text-xs opacity-60">(Alt+1)</span>
                  </div>
                  <ChevronRight size={16} className={`transform transition-transform ${activeTab === 'account' ? 'text-[#b967ff] rotate-90' : 'text-gray-500'}`} />
                </button>
                
                <button
                  ref={notificationsRef}
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'notifications' 
                      ? 'bg-[#2D1D3A] text-[#b967ff] shadow-lg shadow-[#b967ff]/10' 
                      : 'text-gray-300 hover:bg-[#1A0D25] hover:text-white'
                  }`}
                  aria-label="Notification settings tab"
                  aria-selected={activeTab === 'notifications'}
                  aria-controls="notifications-panel"
                >
                  <div className="flex items-center">
                    <Bell size={18} className="mr-3" />
                    Notifications <span className="ml-2 text-xs opacity-60">(Alt+2)</span>
                  </div>
                  <ChevronRight size={16} className={`transform transition-transform ${activeTab === 'notifications' ? 'text-[#b967ff] rotate-90' : 'text-gray-500'}`} />
                </button>
                
                <button
                  ref={securityRef}
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'security' 
                      ? 'bg-[#2D1D3A] text-[#b967ff] shadow-lg shadow-[#b967ff]/10' 
                      : 'text-gray-300 hover:bg-[#1A0D25] hover:text-white'
                  }`}
                  aria-label="Security settings tab"
                  aria-selected={activeTab === 'security'}
                  aria-controls="security-panel"
                >
                  <div className="flex items-center">
                    <Shield size={18} className="mr-3" />
                    Security <span className="ml-2 text-xs opacity-60">(Alt+3)</span>
                  </div>
                  <ChevronRight size={16} className={`transform transition-transform ${activeTab === 'security' ? 'text-[#b967ff] rotate-90' : 'text-gray-500'}`} />
                </button>
                
                <div className="pt-3 mt-3 border-t border-gray-700">
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg text-red-400 hover:bg-red-500/10 transition-colors group"
                    aria-label="Sign out"
                  >
                    <LogOut size={18} className="mr-3 group-hover:translate-x-[-2px] transition-transform" />
                    Sign Out
                  </button>
                </div>
              </nav>
            </div>
          </motion.div>
          
          {/* Main Content */}
          <motion.div 
            className="w-full md:w-3/4"
            variants={itemVariants}
          >
            <div className="bg-[#120a19] p-6 rounded-xl border border-[#b967ff]/20 shadow-lg backdrop-blur-sm">
              {/* Notification */}
              <AnimatePresence>
                {notification.message && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                      notification.type === 'error' 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                        : 'bg-green-500/20 text-green-300 border border-green-500/30'
                    }`}
                    role="alert"
                  >
                    {notification.type === 'error' ? (
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <span>{notification.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Account Settings */}
              <AnimatePresence mode="wait">
                {activeTab === 'account' && (
                  <motion.div
                    key="account"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    id="account-panel"
                    role="tabpanel"
                    aria-labelledby="account-tab"
                  >
                    <h3 className="text-xl font-medium mb-6 text-white border-b border-[#b967ff]/20 pb-2">Account Information</h3>
                    
                    <div className="space-y-6">
                      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 mb-6">
                        <div className="relative group">
                          {session?.user && (
                            <UserAvatar 
                              user={{
                                ...session.user,
                                image: imagePreview || userData?.customImage || userData?.image || session.user.image
                              }}
                              size="xl"
                              showBorder={true}
                              className="ring-offset-2 ring-offset-[#120a19]"
                            />
                          )}
                          
                          <motion.label 
                            htmlFor="profile-image" 
                            className="absolute bottom-0 right-0 bg-[#b967ff] text-white p-2 rounded-full cursor-pointer hover:bg-[#a34de7] transition-colors"
                            whileHover={{ scale: 1.1, rotate: 15 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Upload className="w-4 h-4" />
                            <span className="sr-only">Upload profile image</span>
                          </motion.label>
                          
                          <input
                            id="profile-image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            aria-label="Upload profile picture"
                          />
                        </div>
                        
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Profile Image
                          </label>
                          <p className="text-xs text-gray-400 mb-2">
                            Upload a profile image (JPG, PNG or GIF, max 5MB)
                          </p>
                          {imagePreview && (
                            <motion.button
                              type="button"
                              onClick={() => setImagePreview(null)}
                              className="text-xs text-red-400 hover:text-red-300 hover:underline"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Remove new image
                            </motion.button>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-[#1A0D25] p-5 rounded-lg hover:bg-[#1c0f29] transition-colors group">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-4 py-3 bg-[#2D1D3A] border border-[#b967ff]/30 group-hover:border-[#b967ff]/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b967ff] focus:border-transparent text-white transition-all"
                          placeholder="Your full name"
                          aria-label="Full name"
                        />
                      </div>
                      
                      <div className="bg-[#1A0D25] p-5 rounded-lg hover:bg-[#1c0f29] transition-colors group">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-[#2D1D3A]/50 border border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b967ff] focus:border-transparent text-gray-400 cursor-not-allowed pr-10"
                            disabled
                            aria-label="Email address"
                          />
                          <motion.button
                            onClick={handleCopyEmail}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#b967ff] transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            aria-label="Copy email to clipboard"
                            title="Copy to clipboard"
                          >
                            {copied ? <Check size={16} className="text-green-400" /> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>}
                          </motion.button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Email cannot be changed
                        </p>
                      </div>
                      
                      <div className="bg-[#1A0D25] p-5 rounded-lg hover:bg-[#1c0f29] transition-colors group">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Bio
                        </label>
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 bg-[#2D1D3A] border border-[#b967ff]/30 group-hover:border-[#b967ff]/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b967ff] focus:border-transparent text-white transition-all"
                          placeholder="Tell us a bit about yourself"
                          aria-label="Bio"
                        ></textarea>
                        <p className="mt-2 text-xs text-gray-500">
                          {bio.length}/200 characters
                        </p>
                      </div>
                      
                      <motion.button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full flex justify-center items-center gap-2 bg-[#b967ff] hover:bg-[#a34de7] text-white py-3 px-6 rounded-lg font-medium shadow-lg shadow-[#b967ff]/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {saving ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving Changes...
                          </>
                        ) : (
                          <>
                            <Save size={18} />
                            Save Changes
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
                
                {/* Notification Settings */}
                {activeTab === 'notifications' && (
                  <motion.div
                    key="notifications"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    id="notifications-panel"
                    role="tabpanel"
                    aria-labelledby="notifications-tab"
                  >
                    <h3 className="text-xl font-medium mb-6 text-white border-b border-[#b967ff]/20 pb-2">Notification Preferences</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-[#1A0D25] rounded-lg hover:bg-[#1c0f29] transition-colors">
                        <div>
                          <h4 className="font-medium text-white">Email Notifications</h4>
                          <p className="text-sm text-gray-400">Receive updates via email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={notificationSettings.emailNotifications}
                            onChange={() => setNotificationSettings({
                              ...notificationSettings,
                              emailNotifications: !notificationSettings.emailNotifications
                            })}
                          />
                          <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-[#b967ff] peer-focus:ring-2 peer-focus:ring-[#b967ff]/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-[#1A0D25] rounded-lg hover:bg-[#1c0f29] transition-colors">
                        <div>
                          <h4 className="font-medium text-white">Event Reminders</h4>
                          <p className="text-sm text-gray-400">Get notified before your events</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={notificationSettings.eventReminders}
                            onChange={() => setNotificationSettings({
                              ...notificationSettings,
                              eventReminders: !notificationSettings.eventReminders
                            })}
                          />
                          <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-[#b967ff] peer-focus:ring-2 peer-focus:ring-[#b967ff]/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-[#1A0D25] rounded-lg hover:bg-[#1c0f29] transition-colors">
                        <div>
                          <h4 className="font-medium text-white">Marketing Emails</h4>
                          <p className="text-sm text-gray-400">Receive promotional content</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={notificationSettings.marketingEmails}
                            onChange={() => setNotificationSettings({
                              ...notificationSettings,
                              marketingEmails: !notificationSettings.marketingEmails
                            })}
                          />
                          <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-[#b967ff] peer-focus:ring-2 peer-focus:ring-[#b967ff]/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                      </div>
                      
                      <div className="pt-6">
                        <motion.button
                          onClick={handleSave}
                          disabled={saving}
                          className="w-full flex justify-center items-center gap-2 bg-[#b967ff] hover:bg-[#a34de7] text-white py-3 px-6 rounded-lg font-medium shadow-lg shadow-[#b967ff]/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {saving ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Saving Changes...
                            </>
                          ) : (
                            <>
                              <Save size={18} />
                              Save Preferences
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Security Settings */}
                {activeTab === 'security' && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    id="security-panel"
                    role="tabpanel"
                    aria-labelledby="security-tab"
                  >
                    <h3 className="text-xl font-medium mb-6 text-white border-b border-[#b967ff]/20 pb-2">Security Settings</h3>
                    
                    <div className="space-y-8">
                      {/* Password Change Section */}
                      <div className="bg-[#1A0D25] p-5 rounded-lg">
                        <h4 className="text-lg font-medium mb-4 flex items-center">
                          <Key size={18} className="mr-2 text-[#b967ff]" />
                          Change Password
                        </h4>
                        
                        {/* Password change notification */}
                        <AnimatePresence>
                          {passwordNotification.message && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className={`mb-4 p-3 rounded-lg flex items-start gap-3 ${
                                passwordNotification.type === 'error' 
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                                  : 'bg-green-500/20 text-green-300 border border-green-500/30'
                              }`}
                            >
                              {passwordNotification.type === 'error' ? (
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              ) : (
                                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              )}
                              <span className="text-sm">{passwordNotification.message}</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Current Password
                            </label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-[#2D1D3A] border border-[#b967ff]/30 hover:border-[#b967ff]/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b967ff] focus:border-transparent text-white transition-all"
                              placeholder="Enter your current password"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              New Password
                            </label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-[#2D1D3A] border border-[#b967ff]/30 hover:border-[#b967ff]/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b967ff] focus:border-transparent text-white transition-all"
                              placeholder="Enter your new password"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-[#2D1D3A] border border-[#b967ff]/30 hover:border-[#b967ff]/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b967ff] focus:border-transparent text-white transition-all"
                              placeholder="Confirm your new password"
                            />
                          </div>
                          
                          <motion.button
                            onClick={handlePasswordChange}
                            disabled={changingPassword}
                            className="w-full flex justify-center items-center gap-2 bg-[#b967ff] hover:bg-[#a34de7] text-white py-3 px-6 rounded-lg font-medium shadow-lg shadow-[#b967ff]/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {changingPassword ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Updating Password...
                              </>
                            ) : (
                              <>
                                <Key size={18} />
                                Update Password
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                      
                      {/* Account Deletion Section */}
                      <div className="bg-[#1A0D25] p-5 rounded-lg border border-red-500/30">
                        <h4 className="text-lg font-medium mb-2 text-red-400">Delete Account</h4>
                        <p className="text-sm text-gray-400 mb-4">
                          Once you delete your account, all of your data will be permanently removed. This action cannot be undone.
                        </p>
                        
                        {showDeleteConfirm ? (
                          <div className="space-y-4 p-4 bg-red-500/10 rounded-lg">
                            <p className="text-white font-medium">Are you sure you want to delete your account?</p>
                            <div className="flex gap-4">
                              <motion.button
                                onClick={handleDeleteAccount}
                                disabled={deletingAccount}
                                className="flex-1 flex justify-center items-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                {deletingAccount ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Deleting...
                                  </>
                                ) : (
                                  "Yes, Delete Account"
                                )}
                              </motion.button>
                              <motion.button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deletingAccount}
                                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                Cancel
                              </motion.button>
                            </div>
                          </div>
                        ) : (
                          <motion.button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full text-red-400 hover:text-white border border-red-500 hover:bg-red-500 py-2 px-4 rounded-lg font-medium transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            Delete Account
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
} 