import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Zap, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function WorkStation({ userData }) {
  const [messages, setMessages] = useState([
    { 
      id: 'system-init', 
      role: 'ai', 
      content: `Welcome to your Work Station, ${userData?.name?.split(' ')[0] || 'Guest'}. When are you available to work, and how would you like to tackle your pending tasks?` 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const response = await axios.get('http://localhost:5050/api/tasks/prioritized', { withCredentials: true });
      if (response.data.success) {
        setTasks(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    }
  };

  useEffect(() => {
    fetchTasks();
    // Refresh tasks periodically or after scheduling
    const interval = setInterval(fetchTasks, 60000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInput = (e) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => prev + (prev ? ' ' : '') + transcript);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
      }, 100);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    if (isListening) recognition.stop();
    else recognition.start();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    const historyContext = messages.slice(-6).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const uniqueUserId = `user-${Date.now()}-${Math.random()}`;
    const uniqueLoadingId = `ai-${Date.now()}-${Math.random()}`;

    setMessages((prev) => [
      ...prev, 
      { id: uniqueUserId, role: 'user', content: userText },
      { id: uniqueLoadingId, role: 'ai', content: '*Analyzing schedule...*' }
    ]);

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localTime = new Date().toLocaleString('en-US', { timeZone: userTimezone });

      const response = await axios.post('http://localhost:5050/api/workstation/chat', { 
        message: userText,
        history: historyContext,
        userTimezone,
        localTime
      }, { withCredentials: true });
      
      if (response.data.success) {
        let finalReply = response.data.reply;
        if (response.data.actionTaken === 'EXECUTE_SCHEDULE') {
           finalReply += `\n\n**Calendar Sync Status:** ${response.data.calendarStatus}`;
           fetchTasks();
        }

        setMessages((prev) => 
          prev.map(msg => msg.id === uniqueLoadingId ? { ...msg, content: finalReply } : msg)
        );
      }
    } catch (error) {
      setMessages((prev) => 
        prev.map(msg => msg.id === uniqueLoadingId ? { ...msg, content: "**Error connecting to Execution Manager.**" } : msg)
      );
    }
  };

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

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Filter tasks for the selected date
  // Overdue tasks always show up on "Today" if selectedDate is today
  const filteredTasks = tasks.filter(task => {
    const deadlineDate = new Date(task.deadline);
    const taskIsOverdue = task.status === 'overdue' || deadlineDate < new Date();
    
    if (isToday(selectedDate) && taskIsOverdue && task.status !== 'completed') {
      return true; // Show overdue tasks on today's view
    }

    return deadlineDate.getDate() === selectedDate.getDate() &&
           deadlineDate.getMonth() === selectedDate.getMonth() &&
           deadlineDate.getFullYear() === selectedDate.getFullYear();
  });

  // Calculate color based on priority (Blue -> Purple -> Red)
  const getPriorityColor = (score) => {
    if (score > 80) return 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400';
    if (score > 30) return 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-400';
    return 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400';
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)] bg-white dark:bg-[#131314] overflow-hidden">
      
      {/* Left Pane: Chat Interface */}
      <div className="flex-1 flex flex-col relative border-r border-neutral-200 dark:border-neutral-800">
        <main className="flex-1 overflow-y-auto gemini-scrollbar p-4 sm:p-6 z-10">
          <div className="max-w-3xl mx-auto space-y-8 mt-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-transparent border border-neutral-200 dark:border-neutral-800 text-blue-500">
                    <Zap className="w-4 h-4" />
                  </div>
                )}
                <div className={`max-w-[85%] text-[15px] leading-relaxed ${
                  msg.role === 'user' 
                    ? 'px-5 py-3 bg-neutral-100 dark:bg-[#1E1F20] text-neutral-900 dark:text-neutral-100 rounded-3xl rounded-tr-sm' 
                    : 'pt-1 text-neutral-800 dark:text-neutral-200 markdown-body'
                }`}>
                  {msg.role === 'ai' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} className="h-32 w-full" />
          </div>
        </main>

        {/* Input Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 z-20 bg-gradient-to-t from-white via-white dark:from-[#131314] dark:via-[#131314] to-transparent pt-12">
          <div className="max-w-3xl mx-auto">
            <form 
              onSubmit={handleSend}
              className="flex items-end gap-2 bg-neutral-100 dark:bg-[#1E1F20] p-2 rounded-3xl shadow-sm focus-within:ring-1 focus-within:ring-neutral-300 dark:focus-within:ring-neutral-700 transition-shadow"
            >
              <button 
                type="button" 
                onClick={toggleListening}
                className={`p-3 rounded-full transition-colors shrink-0 ${isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-neutral-500 hover:text-blue-500 hover:bg-neutral-200 dark:hover:bg-[#333537]'}`}
              >
                <Mic className="w-5 h-5" />
              </button>

              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Tell the Execution Manager your available time..."
                className="flex-1 bg-transparent border-none focus:outline-none resize-none py-3 px-2 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 no-scrollbar min-h-[48px]"
                rows={1}
              />

              <button 
                type="submit"
                disabled={!inputValue.trim()}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-[#333537] disabled:text-neutral-500 transition-colors shrink-0 mb-0.5 mr-0.5"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Pane: Day-Wise Calendar */}
      <div className="w-full lg:w-96 bg-neutral-50 dark:bg-[#1A1A1B] flex flex-col shadow-inner z-10">
        
        {/* Date Navigator Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
          <button onClick={goToPreviousDay} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-600 dark:text-neutral-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {isToday(selectedDate) ? "Today" : selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium tracking-wide">
              {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button onClick={goToNextDay} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-600 dark:text-neutral-400">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 gemini-scrollbar">
          <AnimatePresence>
            {filteredTasks.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 space-y-4">
                <CheckCircle2 className="w-12 h-12 opacity-20" />
                <p className="text-sm">No tasks scheduled for this day.</p>
              </motion.div>
            ) : (
              filteredTasks.map(task => {
                const isOverdue = task.status === 'overdue' || new Date(task.deadline) < new Date();
                return (
                  <motion.div 
                    key={task._id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-xl border-l-4 shadow-sm bg-white dark:bg-neutral-900 transition-all hover:shadow-md ${getPriorityColor(task.priorityScore)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-sm line-clamp-2">{task.title}</h3>
                        <div className="flex items-center gap-3 mt-2 opacity-80 text-xs font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {task.technicalEffort}h effort
                          </span>
                          <span>Score: {task.priorityScore}</span>
                        </div>
                      </div>
                      
                      {isOverdue && task.status !== 'completed' && (
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-500 bg-red-100 dark:bg-red-500/20 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          Overdue
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
