import { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Check } from 'lucide-react';

const CalendarWidget = memo(function CalendarWidget({ tasks = [], handleToggleComplete }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // Calculate color based on priority
  const getPriorityColor = (score) => {
    if (score > 80) return { bg: 'bg-red-500/10 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', border: 'border-red-500/20' };
    if (score > 30) return { bg: 'bg-purple-500/10 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500', border: 'border-purple-500/20' };
    return { bg: 'bg-blue-500/10 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', border: 'border-blue-500/20' };
  };

  return (
    <div className="w-full h-fit max-h-[500px] lg:max-h-[800px] bg-white/60 dark:bg-black/20 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-[2rem] flex flex-col z-10 overflow-hidden shadow-2xl relative">
      
      {/* Date Navigator Header */}
      <div className="flex items-center justify-between p-5 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/30 dark:bg-black/10 backdrop-blur-md sticky top-0 z-20">
        <button onClick={goToPreviousDay} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-600 dark:text-neutral-400 cursor-pointer">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            {getDateHeading(selectedDate)}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium tracking-wide">
            {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
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
                          <h3 className={`font-semibold mb-1 text-sm ${colors.text} leading-tight ${task.status === 'completed' ? 'line-through' : ''}`}>
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-xs opacity-80">
                            <span className="flex items-center gap-1 font-medium text-neutral-600 dark:text-neutral-400">
                              <Clock className="w-3.5 h-3.5" />
                              {task.technicalEffort}h block
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
