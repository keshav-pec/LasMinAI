import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Repeat, History, Loader2, Plus, Flame, Target, Trophy, Clock, Trash2, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
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
  const scrollContainerRef = useRef(null);

  // Auto-scroll the heatmap to the current month (right side) on mobile
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [heatmapData, activeTab]);

  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    frequency: 'daily',
    deadlineTime: '18:00',
    complexity: 5,
    technicalEffort: 1
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
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/habits`, newHabit, { withCredentials: true });
      if (res.data.success) {
        toast.success("Habit created!");
        setHabits([res.data.habit, ...habits]);
        setNewHabit({ title: '', description: '', frequency: 'daily', deadlineTime: '18:00', complexity: 5, technicalEffort: 1 });
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

  const tabs = [
    { id: 'habits', label: 'Habits & Consistency', icon: Repeat },
    { id: 'history', label: 'History', icon: History },
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
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-sm"
            >
              
              {/* HABITS TAB */}
              {activeTab === 'habits' && (
                <div className="space-y-8">
                  
                  {/* Heatmap Section */}
                  <div className="bg-neutral-50 dark:bg-neutral-800/20 p-5 sm:p-6 rounded-xl border border-neutral-100 dark:border-neutral-800/60">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-5 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                      Consistency Heatmap
                    </h3>
                    <div 
                      ref={scrollContainerRef}
                      className="w-full overflow-x-auto pb-4 gemini-scrollbar"
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

                  {/* Add New Habit Form */}
                  <div className="bg-neutral-50 dark:bg-neutral-800/20 p-5 sm:p-6 rounded-xl border border-neutral-100 dark:border-neutral-800/60">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-5 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                      Create New Habit
                    </h3>
                    <form onSubmit={handleCreateHabit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <input 
                          type="text" required placeholder="Habit Title (e.g. Read 20 pages)" 
                          value={newHabit.title} onChange={e => setNewHabit({...newHabit, title: e.target.value})}
                          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input 
                          type="text" placeholder="Short Description (Optional)" 
                          value={newHabit.description} onChange={e => setNewHabit({...newHabit, description: e.target.value})}
                          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Frequency</label>
                        <select 
                          value={newHabit.frequency} onChange={e => setNewHabit({...newHabit, frequency: e.target.value})}
                          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly (Mondays)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Daily Deadline Time</label>
                        <input 
                          type="time" required
                          value={newHabit.deadlineTime} onChange={e => setNewHabit({...newHabit, deadlineTime: e.target.value})}
                          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-neutral-100 dark:[color-scheme:dark]"
                        />
                      </div>
                      <div className="sm:col-span-2 flex justify-end mt-2">
                        <button 
                          type="submit" disabled={isCreating}
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                        >
                          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Add Habit
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Habit List Accordions */}
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">Your Active Habits</h3>
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
                              className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                            >
                              <div className="flex items-center gap-4 text-left">
                                <div className={`p-2 rounded-lg ${habit.streak > 0 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
                                  <Flame className={`w-5 h-5 ${habit.streak > 0 ? 'animate-pulse' : ''}`} />
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
                                        <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Spawns At</div>
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
                <div className="space-y-6 flex flex-col items-center justify-center py-12 opacity-50">
                  <History className="w-16 h-16 text-neutral-400" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">History is currently empty</h2>
                  <p className="text-sm text-neutral-500 text-center max-w-sm">
                    As you complete tasks and habits, your historical activity will appear here. Check back later!
                  </p>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
