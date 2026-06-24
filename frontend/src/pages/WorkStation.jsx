import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Zap, ChevronLeft, ChevronRight, CheckCircle2, Clock, BrainCircuit, Check } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import CalendarWidget from '../components/CalendarWidget';

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
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  const handleToggleComplete = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      
      const response = await axios.put(`http://localhost:5050/api/tasks/${taskId}/status`, {
        status: newStatus
      }, { withCredentials: true });

      if (response.data.success) {
        if (newStatus === 'completed') toast.success("Task completed! Great job.");
        else toast.success("Task restored.");
      } else {
        toast.error("Failed to update task status");
        fetchTasks();
      }
    } catch (error) {
      toast.error("Failed to update task status");
      fetchTasks();
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
      toast.error("Voice input is not supported in this browser.");
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
    if (inputRef.current) inputRef.current.style.height = 'auto';

    const uniqueUserId = `user-${Date.now()}-${Math.random()}`;

    setMessages((prev) => [
      ...prev, 
      { id: uniqueUserId, role: 'user', content: userText }
    ]);

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localTime = new Date().toLocaleString('en-US', { timeZone: userTimezone });

      setIsTyping(true);

      const response = await axios.post('http://localhost:5050/api/workstation/chat', { 
        message: userText,
        history: historyContext,
        userTimezone,
        localTime
      }, { withCredentials: true });
      
      setIsTyping(false);

      if (response.data.success) {
        let finalReply = response.data.reply;
        if (response.data.actionTaken === 'EXECUTE_SCHEDULE') {
           finalReply += `\n\n**Calendar Sync Status:** ${response.data.calendarStatus}`;
           fetchTasks();
        }

        setMessages((prev) => [
          ...prev,
          { id: `ai-${Date.now()}-${Math.random()}`, role: 'ai', content: finalReply }
        ]);
      }
    } catch (error) {
      setIsTyping(false);
      toast.error("Failed to process your request. Please try again.");
      setMessages((prev) => [
        ...prev,
        { id: `ai-${Date.now()}-${Math.random()}`, role: 'ai', content: "**Error connecting to Execution Manager.**" }
      ]);
    }
  };



  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)] bg-white dark:bg-[#131314] overflow-hidden">
      
      {/* Left Pane: Day-Wise Calendar */}
      <div className="w-full lg:w-96 bg-neutral-50 dark:bg-[#1A1A1B] flex flex-col z-10 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 lg:h-full h-fit max-h-[50vh] lg:max-h-full shrink-0 p-4 lg:p-4">
        <CalendarWidget tasks={tasks} handleToggleComplete={handleToggleComplete} />
      </div>

      {/* Right Pane: Chat Interface */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-[#131314] lg:h-full h-[60%] overflow-hidden">
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
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-transparent border border-neutral-200 dark:border-neutral-800 text-blue-500 shadow-sm">
                    <Zap className="w-4 h-4" />
                  </div>
                )}
                <div className={`max-w-[85%] text-[15px] leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-neutral-100 dark:bg-[#1E1F20] text-neutral-900 dark:text-white rounded-3xl rounded-tr-sm px-5 py-3 shadow-sm'
                    : 'text-neutral-800 dark:text-neutral-200 py-1'
                }`}>
                  {msg.role === 'ai' ? (
                    <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#1E1F20] prose-pre:border prose-pre:border-neutral-800">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-transparent border border-neutral-200 dark:border-neutral-800 text-blue-500">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="flex gap-1 items-center py-3 bg-neutral-100 dark:bg-[#1E1F20] px-5 rounded-3xl rounded-tl-sm w-fit shadow-sm">
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <div className="p-4 sm:p-6 bg-gradient-to-t from-white via-white to-transparent dark:from-[#131314] dark:via-[#131314] dark:to-transparent z-20">
          <div className="max-w-3xl mx-auto relative">
            <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-neutral-100 dark:bg-[#1E1F20] rounded-3xl p-1.5 border border-neutral-200 dark:border-neutral-800 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50 transition-all">
              <button 
                type="button" 
                onClick={toggleListening}
                className={`p-3 rounded-full transition-colors shrink-0 cursor-pointer ${isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-neutral-500 hover:text-blue-500 hover:bg-neutral-200 dark:hover:bg-[#333537]'}`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputValue.trim()) handleSend(e);
                  }
                }}
                placeholder="Tell the Execution Manager your available time..."
                className="flex-1 bg-transparent border-none focus:outline-none resize-none py-3 px-2 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 no-scrollbar min-h-[48px]"
                rows={1}
              />

              <button 
                type="submit"
                disabled={!inputValue.trim()}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-[#333537] disabled:text-neutral-500 transition-colors shrink-0 mb-0.5 mr-0.5 cursor-pointer"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}
