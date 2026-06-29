import { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Check, FileDown, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const CalendarWidget = memo(function CalendarWidget({ tasks = [], handleToggleComplete }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isExporting, setIsExporting] = useState(false);

  // Date Navigation
  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const getDateHeading = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };
  
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Filter tasks for the selected date
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const deadlineDate = new Date(task.deadline);
      const taskIsOverdue = task.status === 'overdue' || deadlineDate < new Date();
      
      if (isToday(selectedDate) && taskIsOverdue && task.status !== 'completed') {
        return true; // Show overdue tasks on today's view
      }

      return deadlineDate.getDate() === selectedDate.getDate() &&
             deadlineDate.getMonth() === selectedDate.getMonth() &&
             deadlineDate.getFullYear() === selectedDate.getFullYear();
    });
  }, [tasks, selectedDate]);

  const getPriorityColor = (score) => {
    if (score > 75) return { bg: 'bg-amber-500/10 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', border: 'border-amber-500/20' };
    if (score > 20) return { bg: 'bg-blue-500/10 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', border: 'border-blue-500/20' };
    return { bg: 'bg-neutral-200/50 dark:bg-neutral-800/50', text: 'text-neutral-800 dark:text-white', dot: 'bg-neutral-800 dark:bg-white', border: 'border-neutral-300/50 dark:border-neutral-700/50' };
  };

  const handleExport = async () => {
    setIsExporting(true);
    // Use local date string to avoid UTC shift issues
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    try {
      toast.loading("Generating Google Doc with AI...", { id: 'export-toast' });
      const userTimezone = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
      
      const offsetMinutes = new Date().getTimezoneOffset();
      const sign = offsetMinutes > 0 ? '-' : '+';
      const absOffset = Math.abs(offsetMinutes);
      const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
      const minutes = String(absOffset % 60).padStart(2, '0');
      const timezoneOffset = encodeURIComponent(`${sign}${hours}:${minutes}`);

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/reports/daily-doc?date=${dateStr}&timezone=${userTimezone}&timezoneOffset=${timezoneOffset}`, { withCredentials: true });
      if (response.data.success && response.data.documentUrl) {
        toast.success("Google Doc generated successfully!", { id: 'export-toast', icon: '📄' });
        window.open(response.data.documentUrl, '_blank');
      }
    } catch (error) {
      console.error("Export error", error);
      toast.error(error.response?.data?.message || "Failed to generate Google Doc.", { id: 'export-toast', icon: '❌' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full h-fit max-h-[500px] lg:max-h-[800px] bg-white/60 dark:bg-black/20 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-[2rem] flex flex-col z-10 overflow-hidden shadow-2xl relative">
      
      {/* Date Navigator Header */}
      <div className="flex items-center justify-between p-5 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/30 dark:bg-black/10 backdrop-blur-md sticky top-0 z-20">
        <button onClick={goToPreviousDay} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-600 dark:text-neutral-400 cursor-pointer">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {getDateHeading(selectedDate)}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium tracking-wide">
              {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button 
            onClick={handleExport} 
            disabled={isExporting || filteredTasks.length === 0}
            className={`p-2 rounded-xl transition-colors shadow-sm flex items-center justify-center cursor-pointer ${isExporting ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-neutral-200/50 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white'} disabled:opacity-50`}
            title="Export to Google Docs"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin text-neutral-500" /> : <FileDown className="w-5 h-5" />}
          </button>
        </div>
        <button onClick={goToNextDay} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-600 dark:text-neutral-400 cursor-pointer">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Task List Timeline */}
      <div className="flex-1 overflow-y-auto p-6 relative gemini-scrollbar">
        {/* Vertical Timeline Rail */}
        {filteredTasks.length > 0 && (
          <div className="absolute left-[39px] top-6 bottom-6 w-[2px] bg-neutral-200 dark:bg-neutral-800 rounded-full hidden sm:block" />
        )}

        <AnimatePresence>
          {filteredTasks.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 space-y-4">
              <CheckCircle2 className="w-12 h-12 opacity-20" />
              <p className="text-sm">No tasks scheduled for this day.</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map(task => {
                const isOverdue = task.status === 'overdue' || new Date(task.deadline) < new Date();
                const colors = getPriorityColor(task.priorityScore);
                
                return (
                  <motion.div 
                    key={task._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    className="relative pl-0 sm:pl-12"
                  >
                    {/* Timeline Dot */}
                    <div className={`absolute left-[11px] top-4 w-3 h-3 rounded-full border-2 border-white dark:border-[#1A1A1B] z-10 hidden sm:block ${colors.dot} shadow-[0_0_8px_rgba(0,0,0,0.2)] ${task.status === 'completed' ? 'opacity-50 grayscale' : ''}`} />

                    {/* Event Block */}
                    <div className={`p-4 rounded-xl border transition-all ${task.status === 'completed' ? 'opacity-50 grayscale' : ''} ${colors.bg} ${colors.border} backdrop-blur-sm`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-full">
                          <h3 className={`font-semibold mb-1 text-sm flex items-center gap-1.5 flex-wrap ${colors.text} leading-tight ${task.status === 'completed' ? 'line-through' : ''}`}>
                            {task.sourceUrl && (
                              <a 
                                href={task.sourceUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors shrink-0 text-base -mr-0.5"
                                title="Open Source"
                              >
                                🔗
                              </a>
                            )}
                            <span className="break-words">{task.title}</span>
                            <span className="opacity-70 text-xs font-normal whitespace-nowrap">
                              ({new Date(task.deadline).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })})
                            </span>
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-xs opacity-80">
                            <span className="flex items-center gap-1 font-medium text-neutral-600 dark:text-neutral-400">
                              <Clock className="w-3.5 h-3.5" />
                              {(() => {
                                const effort = task.technicalEffort || 0;
                                const h = Math.floor(effort / 60);
                                const m = effort % 60;
                                return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''} block` : `${m}m block`;
                              })()}
                            </span>
                            <span className="flex items-center gap-1 font-medium opacity-60 text-neutral-600 dark:text-neutral-400">
                              P-Score: {task.priorityScore}
                            </span>
                          </div>
                          {isOverdue && task.status !== 'completed' && (
                            <div className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded w-fit uppercase tracking-wider">
                              Overdue
                            </div>
                          )}
                        </div>
                        
                        <button 
                          onClick={() => handleToggleComplete(task._id, task.status)}
                          className={`shrink-0 w-6 h-6 rounded border flex items-center justify-center transition-colors cursor-pointer ${task.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-neutral-400 dark:border-neutral-600 hover:border-neutral-600 dark:hover:border-neutral-400'}`}
                        >
                          {task.status === 'completed' && <Check className="w-4 h-4" />}
                        </button>
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
});

export default CalendarWidget;
