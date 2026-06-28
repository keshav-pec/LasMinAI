import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, Blocks, Info, Loader2, Lightbulb, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { LATEST_EXTENSION_VERSION } from '../config';

export default function Settings({ userData }) {
  const [activeTab, setActiveTab] = useState('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(true);
  const [showRecommendation, setShowRecommendation] = useState(true);
  const [hasExtensionUpdate, setHasExtensionUpdate] = useState(() => {
    return localStorage.getItem('lasminai_extension_version') !== LATEST_EXTENSION_VERSION;
  });

  useEffect(() => {
    const handleExtensionUpdate = () => setHasExtensionUpdate(false);
    window.addEventListener('extension_updated', handleExtensionUpdate);
    return () => window.removeEventListener('extension_updated', handleExtensionUpdate);
  }, []);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      personalData: {},
      professionalData: {}
    }
  });

  // Pre-fill data if available
  useEffect(() => {
    const fetchPersona = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/persona`, {
          withCredentials: true
        });
        if (response.data.success && response.data.persona) {
          reset({
            personalData: response.data.persona.personal || {},
            professionalData: response.data.persona.professional || {}
          });
        }
      } catch (error) {
        console.error("Failed to fetch persona:", error);
      }
    };
    fetchPersona();
  }, [reset]);

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/user/persona`, {
        personalData: data.personalData,
        professionalData: data.professionalData
      }, { withCredentials: true });

      if (response.data.success) {
        toast.success("Settings saved successfully!", { icon: '⚙️' });
      } else {
        toast.error(data.message || "Failed to save settings.", { icon: '❌' });
      }
    } catch (error) {
      toast.error("Failed to save settings.", { icon: '❌' });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };



  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'professional', label: 'Professional', icon: Briefcase },
    { id: 'extensions', label: 'Extensions', icon: Blocks, hasUpdate: hasExtensionUpdate },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Sidebar Tabs */}
        <div className="w-full md:w-56 flex-shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 hide-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors whitespace-nowrap relative ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' 
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                  {tab.hasUpdate && (
                    <div className="absolute right-3 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">!</span>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-sm"
            >
              
              {/* Privacy Disclaimer (Only on Personal & Professional) */}
              {(activeTab === 'personal' || activeTab === 'professional') && (showPrivacy || showRecommendation) && (
                <div className="mb-8 flex flex-col gap-4">
                  {showPrivacy && (
                    <div className="flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl relative group">
                      <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800 dark:text-white leading-relaxed pr-6">
                        <strong>Privacy Notice:</strong> This information will only be used to help in automated form filling and will not be used by LasMinAI internally.
                      </p>
                      <button 
                        type="button" 
                        onClick={() => setShowPrivacy(false)}
                        className="absolute right-3 top-3.5 p-1 rounded-md bg-blue-100/50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 text-blue-500 dark:text-blue-400 hover:bg-blue-200/50 dark:hover:bg-blue-500/30 transition-colors opacity-70 hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {showRecommendation && (
                    <div className="flex items-start gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-xl relative group">
                      <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-emerald-800 dark:text-emerald-100 leading-relaxed pr-6">
                        <strong>Recommendation:</strong> None of the fields are compulsory. But the more you fill, the more you will be benefited at the last minute.
                      </p>
                      <button 
                        type="button" 
                        onClick={() => setShowRecommendation(false)}
                        className="absolute right-3 top-3.5 p-1 rounded-md bg-emerald-100/50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200/50 dark:hover:bg-emerald-500/30 transition-colors opacity-70 hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PERSONAL TAB */}
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">Personal Information</h2>
                  
                  {/* Pre-filled readonly fields */}
                  <div className="flex items-center gap-6 mb-8">
                    <img src={userData?.picture} alt="Profile" className="w-20 h-20 rounded-full border-4 border-neutral-100 dark:border-neutral-800 object-cover" />
                    <div>
                      <p className="text-lg font-medium text-neutral-900 dark:text-white">{userData?.name}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{userData?.email}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Managed by Google</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Gender</label>
                      <select 
                        name="gender" {...register("personalData.gender")}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Date of Birth</label>
                      <input 
                        type="date" 
                        name="dob" {...register("personalData.dob")}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors dark:[color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Father's Name</label>
                      <input 
                        type="text" 
                        name="fathersName" {...register("personalData.fathersName")}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Phone Number</label>
                      <input 
                        type="tel" 
                        name="phone" {...register("personalData.phone")}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Alternate Phone</label>
                      <input 
                        type="tel" 
                        name="altPhone" {...register("personalData.altPhone")}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Address</label>
                      <input 
                        type="text" 
                        name="address" {...register("personalData.address")}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Alternate Address</label>
                      <input 
                        type="text" 
                        name="altAddress" {...register("personalData.altAddress")}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">City</label>
                      <input 
                        type="text" 
                        name="city" {...register("personalData.city")}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">State / Province</label>
                      <input 
                        type="text" 
                        name="state" {...register("personalData.state")}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Country</label>
                      <input 
                        type="text" 
                        name="country" {...register("personalData.country")}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Pincode / Zip</label>
                      <input 
                        type="text" 
                        name="pincode" {...register("personalData.pincode")}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Main Hobby</label>
                      <input 
                        type="text" 
                        name="hobby" {...register("personalData.hobby")}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                    <button 
                      
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* PROFESSIONAL TAB */}
              {activeTab === 'professional' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">Professional Profile</h2>
                  
                  {/* Schooling */}
                  <div className="bg-neutral-50/50 dark:bg-neutral-800/20 p-5 sm:p-6 rounded-xl border border-neutral-100 dark:border-neutral-800/60">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-5 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                      Schooling
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">School Name</label>
                        <input 
                          type="text" {...register(`professionalData.schoolName`)}
                          className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">10th Board Name</label>
                          <input 
                            type="text" {...register(`professionalData.tenthBoard`)} 
                            className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">10th Passing Year</label>
                          <input 
                            type="text" {...register(`professionalData.tenthPassingYear`)} 
                            className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">10th Marks</label>
                          <input 
                            type="text" {...register(`professionalData.marks10th`)} 
                            className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">12th Board Name</label>
                          <input 
                            type="text" {...register(`professionalData.twelfthBoard`)} 
                            className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">12th Passing Year</label>
                          <input 
                            type="text" {...register(`professionalData.twelfthPassingYear`)} 
                            className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">12th Marks</label>
                          <input 
                            type="text" {...register(`professionalData.marks12th`)} 
                            className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* College */}
                  <div className="bg-neutral-50/50 dark:bg-neutral-800/20 p-5 sm:p-6 rounded-xl border border-neutral-100 dark:border-neutral-800/60">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-5 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-purple-500 rounded-full"></div>
                      College / University
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">College Name</label>
                        <input 
                          type="text" {...register(`professionalData.collegeName`)}
                          className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Course / Degree</label>
                        <input 
                          type="text" {...register(`professionalData.course`)} 
                          className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Year of Passing</label>
                        <input 
                          type="text" {...register(`professionalData.collegePassingYear`)}
                          className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">CGPA</label>
                        <input 
                          type="text" {...register(`professionalData.cgpa`)}
                          className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Career */}
                  <div className="bg-neutral-50/50 dark:bg-neutral-800/20 p-5 sm:p-6 rounded-xl border border-neutral-100 dark:border-neutral-800/60">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-5 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                      Career
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Industry</label>
                        <input 
                          type="text" {...register(`professionalData.industry`)} 
                          className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Years of Experience</label>
                        <input 
                          type="number" min="0" {...register(`professionalData.yearsOfExperience`)}
                          className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">LinkedIn Profile URL</label>
                        <input 
                          type="url" {...register(`professionalData.linkedinUrl`)} 
                          className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">GitHub Profile URL</label>
                        <input 
                          type="url" {...register(`professionalData.githubUrl`)} 
                          className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                    <button 
                      
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* EXTENSIONS TAB */}
              {activeTab === 'extensions' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">Browser Extension</h2>
                  
                  {hasExtensionUpdate && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 rounded-xl relative group">
                      <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-100 leading-relaxed pr-6">
                        <strong>Update Available:</strong> You need to download or update the LasMinAI Chrome Extension. Click the button below to download the latest version.
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-6 sm:p-8 flex flex-col items-center text-center relative">
                    <Blocks className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">LasMinAI Everywhere</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mb-6">
                      Get the production-ready Chrome Extension to autofill forms and enforce your focus across the entire web.
                    </p>
                    
                    <a 
                      href="/lasminai-extension.zip" 
                      download="lasminai-extension.zip"
                      onClick={() => {
                        localStorage.setItem('lasminai_extension_version', LATEST_EXTENSION_VERSION);
                        window.dispatchEvent(new Event('extension_updated'));
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                    >
                      Download Extension (.zip)
                    </a>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                      Installation Instructions
                    </h4>
                    <ol className="list-decimal list-inside space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
                      <li>Download the <strong>.zip</strong> file above to your sytem.</li>
                      <li>Extract (unzip) the downloaded file into a regular folder.</li>
                      <li>Open Google Chrome and navigate to <code className="bg-white dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 font-mono text-xs">chrome://extensions/</code></li>
                      <li>Turn on <strong>Developer mode</strong> using the toggle switch in the top right corner.</li>
                      <li>Click the <strong>Load unpacked</strong> button in the top left.</li>
                      <li>Select the extracted folder.</li>
                    </ol>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
