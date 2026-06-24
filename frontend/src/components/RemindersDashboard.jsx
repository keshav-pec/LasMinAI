import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Clock, BellOff } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { subscribeToReminderActions, broadcastReminderAction } from '../utils/reminderSync';

export default function RemindersDashboard() {
  const [reminders, setReminders] = useState([]);

  const fetchReminders = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/reminders`, { withCredentials: true });
      if (response.data.success) {
        setReminders(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch reminders", error);
    }
  };

  useEffect(() => {
    fetchReminders();
    
    const unsubscribe = subscribeToReminderActions((action, payload) => {
      if (action === 'DATA') {
        setReminders(payload);
      } else if (action === 'FETCH' || action === 'DISMISSED' || action === 'SNOOZED') {
        fetchReminders();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDismissReminder = async (id) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/reminders/${id}/dismiss`, {}, { withCredentials: true });
      toast.success("Reminder dismissed");
      broadcastReminderAction('DISMISSED', { id });
      fetchReminders();
    } catch (err) {
      console.error(err);
      toast.error("Failed to dismiss reminder");
    }
  };

  const handleSnoozeReminder = async (id) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/reminders/${id}/snooze`, {}, { withCredentials: true });
      toast.success("Snoozed for 10 minutes");
      broadcastReminderAction('SNOOZED', { id });
      fetchReminders();
    } catch (err) {
      console.error(err);
      toast.error("Failed to snooze reminder");
    }
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="w-full h-fit max-h-[500px] lg:max-h-[800px] bg-white/60 dark:bg-black/20 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-[2rem] flex flex-col z-10 overflow-hidden shadow-2xl relative">
      
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/30 dark:bg-black/10 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Active Reminders</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium tracking-wide">
              {reminders.length} pending
            </p>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      <div className="flex-1 overflow-y-auto p-6 relative gemini-scrollbar">
        <AnimatePresence>
          {reminders.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 space-y-4">
              <BellOff className="w-12 h-12 opacity-20" />
              <p className="text-sm">No active reminders.</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {reminders.map(reminder => {
                const isOverdue = new Date(reminder.remindAt) < new Date();
                
                return (
                  <motion.div 
                    key={reminder._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-xl border transition-all border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm shadow-sm"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="w-full">
                          <h3 className="font-semibold mb-1 text-sm text-neutral-900 dark:text-white leading-tight">
                            {reminder.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-xs opacity-80">
                            <span className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-500 font-bold' : 'text-blue-600 dark:text-blue-400'}`}>
                              <Clock className="w-3.5 h-3.5" />
                              {formatTime(reminder.remindAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-2 pt-3 border-t border-neutral-200 dark:border-neutral-700/50">
                        <button 
                          onClick={() => handleDismissReminder(reminder._id)}
                          className="flex-1 py-2 text-xs font-semibold bg-neutral-100 dark:bg-neutral-700/50 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Dismiss
                        </button>
                        {reminder.snoozable && (
                          <button 
                            onClick={() => handleSnoozeReminder(reminder._id)}
                            className="flex-1 py-2 text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Snooze
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
