import { useState } from 'react';
import { motion } from 'framer-motion';

export default function DummyRegistration() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    bio: '',
    role: '',
    experience: '',
    highSchool: '',
    cgpa: '',
    portfolioUrl: '',
    dob: '',
    middleName: '',
    altPhone: '',
    state: '',
    salary: '',
    noticePeriod: '',
    preferredLocation: '',
    collegeName: '',
    tenthBoard: '',
    twelfthBoard: '',
    personalWebsite: '',
    twitterHandle: '',
    hobby: '',
    fathersName: '',
    bloodGroup: '',
    relocate: '',
    tshirtSize: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-300">
      <div className="max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="px-8 py-6 bg-blue-600">
            <h2 className="text-2xl font-bold text-white tracking-tight">LasMinAI Autofill Test</h2>
            <p className="mt-1 text-blue-100 text-sm">Right-click anywhere to magically fill this form.</p>
          </div>
          
          <form className="px-8 py-8 space-y-6" onSubmit={e => e.preventDefault()}>
            
            {/* Name Fields */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">First Name</label>
                <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="middleName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Middle Name</label>
                <input type="text" name="middleName" id="middleName" value={formData.middleName} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Last Name</label>
                <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="fathersName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Father's Name</label>
                <input type="text" name="fathersName" id="fathersName" value={formData.fathersName} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Date of Birth</label>
                <input type="date" name="dob" id="dob" value={formData.dob} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors dark:[color-scheme:dark]" />
              </div>
            </div>

            {/* Contact Fields */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email Address</label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Phone Number</label>
                <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="altPhone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Alternate Phone</label>
                <input type="tel" name="altPhone" id="altPhone" value={formData.altPhone} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Street Address</label>
              <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">City</label>
                <input type="text" name="city" id="city" value={formData.city} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">State / Province</label>
                <input type="text" name="state" id="state" value={formData.state} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Zip / Postal Code</label>
                <input type="text" name="zipCode" id="zipCode" value={formData.zipCode} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
            </div>

            {/* Education Fields */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="highSchool" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">High School Name</label>
                <input type="text" name="highSchool" id="highSchool" value={formData.highSchool} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="tenthBoard" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">10th Board Name</label>
                <input type="text" name="tenthBoard" id="tenthBoard" value={formData.tenthBoard} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="twelfthBoard" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">12th Board Name</label>
                <input type="text" name="twelfthBoard" id="twelfthBoard" value={formData.twelfthBoard} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="collegeName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">College / University Name</label>
                <input type="text" name="collegeName" id="collegeName" value={formData.collegeName} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="cgpa" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">University CGPA</label>
                <input type="text" name="cgpa" id="cgpa" value={formData.cgpa} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
            </div>

            {/* Career Fields */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Years of IT Experience</label>
                <input type="number" name="experience" id="experience" value={formData.experience} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="salary" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Current Salary (CTC)</label>
                <input type="text" name="salary" id="salary" value={formData.salary} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="noticePeriod" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Notice Period (Days)</label>
                <input type="number" name="noticePeriod" id="noticePeriod" value={formData.noticePeriod} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
            </div>

            {/* Links & Socials */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="portfolioUrl" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Portfolio/GitHub URL</label>
                <input type="url" name="portfolioUrl" id="portfolioUrl" value={formData.portfolioUrl} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="personalWebsite" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Personal Website</label>
                <input type="url" name="personalWebsite" id="personalWebsite" value={formData.personalWebsite} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="twitterHandle" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Twitter Handle</label>
                <input type="text" name="twitterHandle" id="twitterHandle" value={formData.twitterHandle} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
            </div>

            {/* Misc & Personal Preferences */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="hobby" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Main Hobby</label>
                <input type="text" name="hobby" id="hobby" value={formData.hobby} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="bloodGroup" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Blood Group</label>
                <input type="text" name="bloodGroup" id="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label htmlFor="preferredLocation" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Preferred Location</label>
                <input type="text" name="preferredLocation" id="preferredLocation" value={formData.preferredLocation} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors" />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Short Biography (AI should generate this!)</label>
              <textarea
                name="bio"
                id="bio"
                rows={3}
                value={formData.bio}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors"
              />
            </div>
            
             {/* Dropdowns */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Select your role</label>
                <select name="role" id="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors">
                  <option value="">Please select a role...</option>
                  <option value="developer">Software Developer</option>
                  <option value="designer">UX/UI Designer</option>
                  <option value="manager">Product Manager</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="relocate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Willing to Relocate?</label>
                <select name="relocate" id="relocate" value={formData.relocate} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors">
                  <option value="">Select option...</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="maybe">Maybe / Open to discuss</option>
                </select>
              </div>
              <div>
                <label htmlFor="tshirtSize" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">T-Shirt Size</label>
                <select name="tshirtSize" id="tshirtSize" value={formData.tshirtSize} onChange={handleChange} className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-blue-500 transition-colors">
                  <option value="">Select size...</option>
                  <option value="xs">Extra Small</option>
                  <option value="s">Small</option>
                  <option value="m">Medium</option>
                  <option value="l">Large</option>
                  <option value="xl">Extra Large</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Submit Form
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
