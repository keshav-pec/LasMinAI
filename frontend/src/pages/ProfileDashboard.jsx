import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Repeat, History, Loader2, Plus, Flame, Target, Trophy, Clock, Trash2, Calendar as CalendarIcon, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Eye, Pencil, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { subDays, format } from 'date-fns';

export default function ProfileDashboard({ userData }) {
  const [activeTab, setActiveTab] = useState('habits');
  const [habits, setHabits] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedHabits, setExpandedHabits] = useState({});
  const [isHeatmapExpanded, setIsHeatmapExpanded] = useState(false);
  const [isCreateExpanded, setIsCreateExpanded] = useState(false);
  const scrollContainerRef = useRef(null);

  // History Tab State
  const [historyDate, setHistoryDate] = useState(new Date());
  const [historyType, setHistoryType] = useState('tasks');
  const [historyItems, setHistoryItems] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [isEditingItem, setIsEditingItem] = useState(false);

  // Auto-scroll the heatmap to the current month (right side)
  useEffect(() => {
    if (activeTab === 'habits') {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
      }, 50);
    }
  }, [heatmapData, activeTab]);

  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    frequency: 'daily',
    deadlineTime: '18:00',
    complexity: 5,
    technicalEffort: 60
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [habitsRes, heatmapRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/habits`, { withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/habits/heatmap`, { withCredentials: true })
      ]);
      if (habitsRes.data.success) setHabits(habitsRes.data.habits);
      if (heatmapRes.data.success) {
        // react-calendar-heatmap expects format { date: 'YYYY-MM-DD', count: N }
        setHeatmapData(heatmapRes.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch habits:", error);
      toast.error("Failed to load habits.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateHabit = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const offsetMinutes = new Date().getTimezoneOffset();
      const sign = offsetMinutes > 0 ? '-' : '+';
      const absOffset = Math.abs(offsetMinutes);
      const hrs = String(Math.floor(absOffset / 60)).padStart(2, '0');
      const mins = String(absOffset % 60).padStart(2, '0');

      const payload = {
        ...newHabit,
        timezoneOffset: `${sign}${hrs}:${mins}`
      };

      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/habits`, payload, {
        withCredentials: true
      });
      if (res.data.success) {
        toast.success("Habit created!");
        setHabits([res.data.habit, ...habits]);
        setNewHabit({ title: '', description: '', frequency: 'daily', deadlineTime: '18:00', complexity: 5, technicalEffort: 60 });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create habit");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteHabit = async (id) => {
    if (!window.confirm("Are you sure you want to delete this habit?")) return;
    try {
      const res = await axios.delete(`${import.meta.env.VITE_API_URL}/api/habits/${id}`, { withCredentials: true });
      if (res.data.success) {
        toast.success("Habit deleted");
        setHabits(habits.filter(h => h._id !== id));
      }
    } catch (error) {
      toast.error("Failed to delete habit");
    }
  };

  const toggleAccordion = (id) => {
    setExpandedHabits(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const dateStr = format(historyDate, 'yyyy-MM-dd');
      const endpoint = historyType === 'tasks' ? `/api/tasks?date=${dateStr}` : `/api/reminders/history?date=${dateStr}`;
      const res = await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`, { withCredentials: true });
      if (res.data.success) {
        setHistoryItems(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load history.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [historyDate, historyType, activeTab]);

  const handleDeleteHistoryItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    try {
      const endpoint = historyType === 'tasks' ? `/api/tasks/${id}` : `/api/reminders/${id}`;
      const res = await axios.delete(`${import.meta.env.VITE_API_URL}${endpoint}`, { withCredentials: true });
      if (res.data.success) {
        toast.success("Deleted successfully");
        setHistoryItems(historyItems.filter(item => item._id !== id));
        if (viewingItem && viewingItem._id === id) setViewingItem(null);
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const handleUpdateHistoryItem = async (e) => {
    e.preventDefault();
    try {
      const endpoint = historyType === 'tasks' ? `/api/tasks/${viewingItem._id}` : `/api/reminders/${viewingItem._id}`;
      const payload = historyType === 'tasks' ? {
        title: viewingItem.title,
        description: viewingItem.description,
        deadline: viewingItem.deadline,
        sourceUrl: viewingItem.sourceUrl,
        complexity: viewingItem.complexity,
        technicalEffort: viewingItem.technicalEffort
      } : {
        title: viewingItem.title,
        remindAt: viewingItem.remindAt
      };
      
      const res = await axios.put(`${import.meta.env.VITE_API_URL}${endpoint}`, payload, { withCredentials: true });
      if (res.data.success) {
        toast.success("Updated successfully");
        setHistoryItems(historyItems.map(item => item._id === viewingItem._id ? res.data.data : item));
        setViewingItem(res.data.data);
        setIsEditingItem(false);
      }
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const tabs = [
    { id: 'habits', label: 'Habits', icon: Repeat },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 min-h-[calc(100vh-8rem)]">
      <div className="w-full flex flex-col md:flex-row gap-8">
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
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' 
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-sm"
            >
              
              {/* HABITS TAB */}
              {activeTab === 'habits' && (
                <div className="space-y-8 w-full">
                  
                  {/* Heatmap Section */}
                  <div className="bg-neutral-50 dark:bg-neutral-800/20 p-4 sm:p-5 rounded-xl border border-neutral-100 dark:border-neutral-800/60 transition-colors hover:border-neutral-200 dark:hover:border-neutral-700">
                    <div className="w-full flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">          
                          Consistency Heatmap
                        </h3>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-md text-xs font-bold">
                          <Flame className="w-3.5 h-3.5" />
                          {(() => {
                            if (!heatmapData || heatmapData.length === 0) return 0;
                            const activeDates = new Set(heatmapData.filter(d => d.count >= 1).map(d => d.date));
                            let streak = 0;
                            let currentDate = new Date();
                            while (true) {
                              const yyyy = currentDate.getFullYear();
                              const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
                              const dd = String(currentDate.getDate()).padStart(2, '0');
                              const dateStr = `${yyyy}-${mm}-${dd}`;
                              if (activeDates.has(dateStr)) {
                                streak++;
                                currentDate.setDate(currentDate.getDate() - 1);
                              } else {
                                break;
                              }
                            }
                            return streak;
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      ref={scrollContainerRef}
                      className="w-full overflow-x-auto pt-2 pb-1 gemini-scrollbar"
                    >
                      <div className="min-w-[700px] max-w-[900px] mx-auto text-xs px-2">
                        <CalendarHeatmap
                          startDate={subDays(new Date(), 365)}
                          endDate={new Date()}
                          values={heatmapData}
                          classForValue={(value) => {
                            if (!value) return 'fill-neutral-200 dark:fill-neutral-800';
                            if (value.count === 1) return 'fill-emerald-200 dark:fill-emerald-900/50';
                            if (value.count === 2) return 'fill-emerald-300 dark:fill-emerald-800/60';
                            if (value.count === 3) return 'fill-emerald-400 dark:fill-emerald-700/80';
                            return 'fill-emerald-500 dark:fill-emerald-500';
                          }}
                          tooltipDataAttrs={(value) => {
                            if (!value || !value.date) {
                              return {
                                'data-tooltip-id': 'heatmap-tooltip',
                                'data-tooltip-content': 'No habits completed'
                              };
                            }
                            return {
                              'data-tooltip-id': 'heatmap-tooltip',
                              'data-tooltip-content': `${value.count || 0} habits completed on ${value.date}`
                            };
                          }}
                          showWeekdayLabels={true}
                        />
                        <Tooltip id="heatmap-tooltip" className="z-50 !bg-neutral-900 !text-white !rounded-lg !text-xs !font-medium !px-3 !py-1.5 shadow-xl" />
                      </div>
                    </div>
                  </div>

                  {/* Habit List Accordions and Create Form */}
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-6 pl-2 sm:pl-3 uppercase tracking-wider flex items-center gap-3">
                      <button 
                        onClick={() => setIsCreateExpanded(!isCreateExpanded)}
                        title="Create New Habit"
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-white shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 opacity-60 hover:opacity-100 ${isCreateExpanded ? 'bg-neutral-400 hover:bg-neutral-500' : 'bg-blue-400 hover:bg-blue-500'}`}
                      >
                        {isCreateExpanded ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                      Your Active Habits
                    </h3>

                    <AnimatePresence>
                      {isCreateExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mb-6 px-2 sm:px-3"
                        >
                          <div className="bg-neutral-50 dark:bg-neutral-800/30 p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-700/60 shadow-sm">
                            <form onSubmit={handleCreateHabit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="sm:col-span-2">
                                <input 
                                  type="text" required placeholder="Habit Title (e.g. Read 20 pages)" 
                                  value={newHabit.title} onChange={e => setNewHabit({...newHabit, title: e.target.value})}
                                  className="w-full px-3 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <input 
                                  type="text" placeholder="Short Description (Optional)" 
                                  value={newHabit.description} onChange={e => setNewHabit({...newHabit, description: e.target.value})}
                                  className="w-full px-3 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-neutral-500 mb-1 ml-1">Frequency</label>
                                <select 
                                  value={newHabit.frequency} onChange={e => setNewHabit({...newHabit, frequency: e.target.value})}
                                  className="w-full px-3 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100"
                                >
                                  <option value="daily">Daily</option>
                                  <option value="weekly">Weekly (Mondays)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-neutral-500 mb-1 ml-1">Daily Deadline Time</label>
                                <input 
                                  type="time" required
                                  value={newHabit.deadlineTime} onChange={e => setNewHabit({...newHabit, deadlineTime: e.target.value})}
                                  className="w-full px-3 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 dark:[color-scheme:dark]"
                                />
                              </div>
                              <div className="sm:col-span-2 flex justify-end mt-2">
                                <button 
                                  type="submit" disabled={isCreating}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                                >
                                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                  Add Habit
                                </button>
                              </div>
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      </div>
                    ) : habits.length === 0 ? (
                      <p className="text-neutral-500 dark:text-neutral-400 text-sm">No habits created yet. Build consistency by adding one above!</p>
                    ) : (
                      <div className="space-y-3">
                        {habits.map(habit => (
                          <div key={habit._id} className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-800/50">
                            <button 
                              onClick={() => toggleAccordion(habit._id)}
                              className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                            >
                              <div className="flex items-center gap-3.5 text-left">
                                <div className={`p-1.5 rounded-lg ${habit.streak > 0 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
                                  <Flame className={`w-4 h-4 ${habit.streak > 0 ? 'animate-pulse' : ''}`} />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-neutral-900 dark:text-white">{habit.title}</h4>
                                  <p className="text-xs text-neutral-500 mt-0.5 capitalize">{habit.frequency} • {habit.streak} Day Streak</p>
                                </div>
                              </div>
                              <div className="text-neutral-400">
                                {expandedHabits[habit._id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </div>
                            </button>
                            
                            <AnimatePresence>
                              {expandedHabits[habit._id] && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-neutral-100 dark:border-neutral-700/50"
                                >
                                  <div className="p-4 sm:p-5 bg-neutral-50/50 dark:bg-neutral-900/30">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                      <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                        <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Flame className="w-3 h-3"/> Current Streak</div>
                                        <div className="text-lg font-bold text-orange-600">{habit.streak}</div>
                                      </div>
                                      <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                        <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Trophy className="w-3 h-3"/> Best Streak</div>
                                        <div className="text-lg font-bold text-yellow-600">{habit.bestStreak}</div>
                                      </div>
                                      <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                        <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Target className="w-3 h-3"/> Total Done</div>
                                        <div className="text-lg font-bold text-blue-600">{habit.totalCompleted}</div>
                                      </div>
                                      <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                        <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Deadline</div>
                                        <div className="text-lg font-bold text-emerald-600">{habit.deadlineTime}</div>
                                      </div>
                                    </div>
                                    <div className="flex justify-end">
                                      <button 
                                        onClick={() => handleDeleteHabit(habit._id)}
                                        className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-md transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete Habit
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* HISTORY TAB */}
              {activeTab === 'history' && (
                <div className="space-y-6 w-full">
                  {/* Date Navigation & Type Selector */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-50 dark:bg-neutral-800/30 p-4 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                    <div className="flex items-center gap-4">
                      <button onClick={() => setHistoryDate(subDays(historyDate, 1))} className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                      </button>
                      <input 
                        type="date"
                        value={format(historyDate, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          if (e.target.value) {
                            // Ensure the date is interpreted as local time by avoiding Z
                            const newDate = new Date(e.target.value + 'T12:00:00');
                            setHistoryDate(newDate);
                          }
                        }}
                        className="font-medium text-neutral-900 dark:text-white min-w-[140px] text-center bg-transparent border-none focus:ring-0 cursor-pointer dark:[color-scheme:dark] px-2 py-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                      />
                      <button onClick={() => setHistoryDate(new Date(historyDate.getTime() + 86400000))} className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                        <ChevronRight className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select 
                        value={historyType} 
                        onChange={e => setHistoryType(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                      >
                        <option value="tasks">Tasks</option>
                        <option value="reminders">Reminders</option>
                      </select>
                    </div>
                  </div>

                  {/* History List */}
                  {isHistoryLoading ? (
                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                  ) : historyItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 opacity-50">
                      <History className="w-16 h-16 text-neutral-400 mb-4" />
                      <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">No {historyType} found</h2>
                      <p className="text-sm text-neutral-500 text-center mt-2">
                        You don't have any {historyType} scheduled for this date.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {historyItems.map(item => {
                        const isCompleted = item.status === 'completed' || item.status === 'dismissed';
                        const isOverdue = item.status === 'overdue' || (item.status === 'active' && new Date(item.remindAt) < new Date());
                        let statusColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
                        if (isCompleted) statusColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
                        else if (isOverdue) statusColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';

                        return (
                          <div key={item._id} className="group flex items-center justify-between p-4 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${statusColor}`}>
                                {historyType === 'tasks' ? <Target className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              </div>
                              <div>
                                <h4 className="font-medium text-neutral-900 dark:text-white">{item.title}</h4>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                  {historyType === 'tasks' ? 
                                    (item.deadline ? format(new Date(item.deadline), 'h:mm a') : 'No deadline') : 
                                    (item.remindAt ? format(new Date(item.remindAt), 'h:mm a') : 'No time')
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setViewingItem(item); setIsEditingItem(false); }} className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="View/Edit">
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* View / Edit Modal */}
      <AnimatePresence>
        {viewingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {isEditingItem ? `Edit ${historyType === 'tasks' ? 'Task' : 'Reminder'}` : `${historyType === 'tasks' ? 'Task' : 'Reminder'} Details`}
                </h3>
                <div className="flex items-center gap-2">
                  {!isEditingItem && (
                    <button onClick={() => setIsEditingItem(true)} className="p-2 text-neutral-500 hover:text-blue-600 bg-neutral-100 hover:bg-blue-50 dark:bg-neutral-800 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => { setViewingItem(null); setIsEditingItem(false); }} className="p-2 text-neutral-500 hover:text-red-600 bg-neutral-100 hover:bg-red-50 dark:bg-neutral-800 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-5">
                {isEditingItem ? (
                  <form onSubmit={handleUpdateHistoryItem} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">Title</label>
                      <input 
                        type="text" required
                        value={viewingItem.title} 
                        onChange={e => setViewingItem({...viewingItem, title: e.target.value})}
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {historyType === 'tasks' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1">Description</label>
                          <textarea 
                            value={viewingItem.description || ''} 
                            onChange={e => setViewingItem({...viewingItem, description: e.target.value})}
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1">Deadline Date</label>
                            <input 
                              type="date" required
                              value={viewingItem.deadline ? format(new Date(viewingItem.deadline), 'yyyy-MM-dd') : ''}
                              onChange={e => setViewingItem({
                                ...viewingItem, 
                                deadline: new Date(e.target.value + 'T' + (viewingItem.deadline ? format(new Date(viewingItem.deadline), 'HH:mm') : '12:00')).toISOString()
                              })}
                              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm dark:text-white dark:[color-scheme:dark]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1">Time</label>
                            <input 
                              type="time" required
                              value={viewingItem.deadline ? format(new Date(viewingItem.deadline), 'HH:mm') : ''}
                              onChange={e => setViewingItem({
                                ...viewingItem, 
                                deadline: new Date((viewingItem.deadline ? format(new Date(viewingItem.deadline), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')) + 'T' + e.target.value).toISOString()
                              })}
                              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm dark:text-white dark:[color-scheme:dark]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1">Source URL</label>
                          <input 
                            type="url"
                            value={viewingItem.sourceUrl || ''} 
                            onChange={e => setViewingItem({...viewingItem, sourceUrl: e.target.value})}
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1">Complexity (1-5)</label>
                            <input 
                              type="number" min="1" max="5" required
                              value={viewingItem.complexity || 3} 
                              onChange={e => setViewingItem({...viewingItem, complexity: parseInt(e.target.value)})}
                              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1">Effort (mins)</label>
                            <input 
                              type="number" min="5" max="1440" step="1" required
                              value={viewingItem.technicalEffort || 120} 
                              onChange={e => setViewingItem({...viewingItem, technicalEffort: parseInt(e.target.value)})}
                              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    {historyType === 'reminders' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1">Date</label>
                          <input 
                            type="date" required
                            value={viewingItem.remindAt ? format(new Date(viewingItem.remindAt), 'yyyy-MM-dd') : ''}
                            onChange={e => setViewingItem({
                              ...viewingItem, 
                              remindAt: new Date(e.target.value + 'T' + (viewingItem.remindAt ? format(new Date(viewingItem.remindAt), 'HH:mm') : '12:00')).toISOString()
                            })}
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm dark:text-white dark:[color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1">Time</label>
                          <input 
                            type="time" required
                            value={viewingItem.remindAt ? format(new Date(viewingItem.remindAt), 'HH:mm') : ''}
                            onChange={e => setViewingItem({
                              ...viewingItem, 
                              remindAt: new Date((viewingItem.remindAt ? format(new Date(viewingItem.remindAt), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')) + 'T' + e.target.value).toISOString()
                            })}
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm dark:text-white dark:[color-scheme:dark]"
                          />
                        </div>
                      </div>
                    )}
                    <div className="pt-2 flex gap-3">
                      <button type="button" onClick={() => setIsEditingItem(false)} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                      <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">Save Changes</button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {historyType === 'tasks' && viewingItem.description && (
                      <div>
                        <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Description</h4>
                        <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">{viewingItem.description}</p>
                      </div>
                    )}
                    {historyType === 'tasks' && viewingItem.sourceUrl && (
                      <div>
                        <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Source URL</h4>
                        <a href={viewingItem.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{viewingItem.sourceUrl}</a>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      {historyType === 'tasks' && (
                        <>
                          <div>
                            <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Effort</h4>
                            <p className="text-sm text-neutral-800 dark:text-neutral-200 font-medium">
                              {(() => {
                                const effort = viewingItem.technicalEffort || 120;
                                const h = Math.floor(effort / 60);
                                const m = effort % 60;
                                return h > 0 ? `${h} hrs${m > 0 ? ` ${m} mins` : ''}` : `${m} mins`;
                              })()}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Complexity</h4>
                            <p className="text-sm text-neutral-800 dark:text-neutral-200 font-medium">{viewingItem.complexity || 3}/5</p>
                          </div>
                        </>
                      )}
                      <div>
                        <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Scheduled For</h4>
                        <p className="text-sm text-neutral-800 dark:text-neutral-200 font-medium">
                          {historyType === 'tasks' ? 
                            (viewingItem.deadline ? format(new Date(viewingItem.deadline), 'MMM d, yyyy - h:mm a') : 'None') :
                            (viewingItem.remindAt ? format(new Date(viewingItem.remindAt), 'MMM d, yyyy - h:mm a') : 'None')
                          }
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Status</h4>
                        <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold capitalize ${
                          (viewingItem.status === 'completed' || viewingItem.status === 'dismissed') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          (viewingItem.status === 'overdue' || (viewingItem.status === 'active' && new Date(viewingItem.remindAt) < new Date())) ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {viewingItem.status}
                        </span>
                      </div>
                    </div>
                    <div className="pt-4 mt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <button onClick={() => handleDeleteHistoryItem(viewingItem._id)} className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium transition-colors">
                        <Trash2 className="w-4 h-4" />
                        Delete {historyType === 'tasks' ? 'Task' : 'Reminder'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
