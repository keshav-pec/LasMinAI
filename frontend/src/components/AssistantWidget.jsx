import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Send, Mic, MicOff, ChevronDown, ChevronUp, Clock, Check } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { subscribeToReminderActions, broadcastReminderAction } from '../utils/reminderSync';

export default function AssistantWidget({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [showRemindersList, setShowRemindersList] = useState(false);
  const [triggeredReminder, setTriggeredReminder] = useState(null); // For the central dialog
  
  const [mathChallenge, setMathChallenge] = useState(null);
  const [mathAnswer, setMathAnswer] = useState("");
  
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState([
    { role: 'ai', content: "I'm your Reminders AI. What do you need me to remember?" }
  ]);

  const generateMathProblem = () => {
    const types = ['add', 'sub', 'square'];
    const type = types[Math.floor(Math.random() * types.length)];
    if (type === 'add') {
      const a = Math.floor(Math.random() * 90) + 10;
      const b = Math.floor(Math.random() * 90) + 10;
      return { text: `${a} + ${b} = ?`, answer: a + b };
    } else if (type === 'sub') {
      const a = Math.floor(Math.random() * 90) + 10;
      const b = Math.floor(Math.random() * 90) + 10;
      const max = Math.max(a, b);
      const min = Math.min(a, b);
      return { text: `${max} - ${min} = ?`, answer: max - min };
    } else {
      const a = Math.floor(Math.random() * 21) + 5;
      return { text: `${a}² = ?`, answer: a * a };
    }
  };

  const messagesEndRef = useRef(null);
  const audioCtxRef = useRef(null);
  const notifiedIdsRef = useRef(new Set());
  const location = useLocation();
  const isPillMode = location.pathname === '/task-prompter' || location.pathname === '/work-station';

  // Listen for remote toggle from UI pills
  useEffect(() => {
    const handler = () => setIsOpen(p => !p);
    window.addEventListener('toggle_reminders_widget', handler);
    return () => window.removeEventListener('toggle_reminders_widget', handler);
  }, []);

  // Init audio context on first user interaction to bypass autoplay policy
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      document.removeEventListener('click', initAudio);
    };
    document.addEventListener('click', initAudio);
    return () => document.removeEventListener('click', initAudio);
  }, []);



  // Broadcast reminders count for pill UIs
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sync_reminders_count', { detail: reminders.length }));
  }, [reminders.length]);

  // Fetch Reminders
  const fetchReminders = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/reminders`, { withCredentials: true });
      if (res.data.success) {
        setReminders(res.data.data);
        broadcastReminderAction('DATA', res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReminders();
      // 60-second background sync
      const syncInterval = setInterval(() => {
        fetchReminders();
      }, 60000);
      
      const unsubscribe = subscribeToReminderActions((action, payload) => {
        if (action === 'FETCH') {
          fetchReminders();
        } else if (action === 'DATA') {
          setReminders(payload);
        } else if (action === 'DISMISSED') {
          handleDismissReminder(payload.id, true);
        } else if (action === 'SNOOZED') {
          handleSnoozeReminder(payload.id, true);
        }
      });

      return () => {
        clearInterval(syncInterval);
        unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, showRemindersList]);

  // Auto-submit math challenge
  useEffect(() => {
    if (mathChallenge && mathAnswer.trim() === mathChallenge.answer.toString() && triggeredReminder) {
      handleDismissReminder(triggeredReminder._id);
      setMathChallenge(null);
      setMathAnswer("");
    }
  }, [mathAnswer, mathChallenge, triggeredReminder]);

  const onInitiateDismiss = () => {
    if (!mathChallenge) {
      setMathChallenge(generateMathProblem());
      setMathAnswer("");
    }
  };

  // Handle Notifications Loop
  useEffect(() => {
    if (!reminders.length) return;

    const interval = setInterval(() => {
      const now = new Date();
      reminders.forEach(reminder => {
        const remindTime = new Date(reminder.remindAt);
        // If it's time and we haven't notified yet
        if (now >= remindTime && !notifiedIdsRef.current.has(reminder._id)) {
          notifiedIdsRef.current.add(reminder._id);
          triggerNotification(reminder);
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [reminders]);

  // Play a buzzing/beeping sound using Web Audio API
  const playBuzzSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      
      // Resume context if suspended (browser auto-play policy)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
      
      oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.2);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
      oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.4);

      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context not supported or blocked", e);
    }
  };

  const triggerNotification = async (reminder) => {
    // Play audio buzz
    playBuzzSound();
    
    // reset any previous math challenge
    setMathChallenge(null);
    setMathAnswer("");
    
    // Show central dialog
    setTriggeredReminder(reminder);

    // Instant-sync to Chrome Extension (bypasses 1-minute poll limit)
    window.postMessage({ type: 'LASMIN_REMINDER_DUE', reminders: [reminder] }, '*');

    // 2. Service Worker Push Notification
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      if (Notification.permission === 'granted') {
        registration.showNotification('LasMinAI Reminder', {
          body: reminder.title,
          icon: '/favicon.ico',
          vibrate: [200, 100, 200, 100, 200, 100, 200],
          tag: reminder._id,
        });
      }
    }
  };

  const handleDismissReminder = async (id, isBroadcast = false) => {
    try {
      setTriggeredReminder((prev) => (prev && prev._id === id ? null : prev));
      if (!isBroadcast) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/reminders/${id}/dismiss`, {}, { withCredentials: true });
        broadcastReminderAction('DISMISSED', { id });
        fetchReminders();
      } else {
        fetchReminders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSnoozeReminder = async (id, isBroadcast = false) => {
    try {
      setTriggeredReminder((prev) => (prev && prev._id === id ? null : prev));
      if (!isBroadcast) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/reminders/${id}/snooze`, {}, { withCredentials: true });
        toast.success("Snoozed for 10 minutes", { icon: '⏰' });
        broadcastReminderAction('SNOOZED', { id });
        fetchReminders();
      } else {
        fetchReminders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Speech Recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const handleVoiceInput = () => {
    if (!SpeechRecognition) {
      toast.error("Your browser doesn't support voice input.", { icon: '🚫' });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error !== 'no-speech') toast.error("Microphone error.", { icon: '🎤' });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSendMessage(transcript);
    };

    recognition.start();
  };

  const handleSendMessage = async (textToSubmit = input) => {
    if (!textToSubmit.trim()) return;
    
    const userMsg = { role: 'user', content: textToSubmit };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      const localDate = new Date();
      const explicitTime = localDate.toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: 'numeric', 
        second: 'numeric', 
        timeZoneName: 'long' 
      });

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/reminders/chat`, {
        message: textToSubmit,
        history,
        localTime: explicitTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }, { withCredentials: true });

      if (res.data.success) {
        setHistory(prev => [...prev, { role: 'ai', content: res.data.reply }]);
        setReminders(res.data.reminders);
        broadcastReminderAction('FETCH'); // Let other tabs/components know!
      }
    } catch (error) {
      toast.error("Assistant failed to respond.", { icon: '🤖' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Ask for notification permissions on open
  useEffect(() => {
    if (isOpen && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isOpen]);

  // Hide if on auth page or user is not logged in
  if (!user || location.pathname === '/auth' || location.pathname === '/settings') {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col items-start">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-4 w-80 sm:w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '600px', height: 'calc(100vh - 120px)' }}
          >
            {/* Header */}
            <div className="p-3 bg-blue-500 text-white flex justify-between items-center rounded-t-3xl">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <h3 className="font-bold">Reminders</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-blue-600 p-1 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Reminders Dropdown */}
            <div className="border-b border-neutral-200 dark:border-neutral-800">
              <button 
                onClick={() => setShowRemindersList(!showRemindersList)}
                className="w-full p-3 flex justify-between items-center text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Active Reminders ({reminders.length})</span>
                </div>
                {showRemindersList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {showRemindersList && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-neutral-50 dark:bg-neutral-900/50"
                  >
                    <div className="max-h-40 overflow-y-auto p-2 space-y-2">
                      {reminders.length === 0 ? (
                        <p className="text-xs text-center text-neutral-500 py-2">No active reminders.</p>
                      ) : (
                        reminders.map(r => (
                          <div key={r._id} className="flex justify-between items-center bg-white dark:bg-neutral-800 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{r.title}</span>
                              <span className="text-xs text-blue-500 font-medium mt-0.5">
                                {new Date(r.remindAt).toLocaleString(undefined, { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric', 
                                  hour: 'numeric', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <button 
                              onClick={() => handleDismissReminder(r._id)}
                              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md text-neutral-500 dark:text-neutral-400"
                              title="Dismiss"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {history.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-sm'}`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-blue-600 dark:text-blue-400" {...props} />,
                        code: ({node, inline, ...props}) => <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-xs font-mono font-semibold" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 p-3 rounded-2xl rounded-bl-sm text-sm animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex items-center space-x-2 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-full"
              >
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-neutral-500 hover:text-blue-500'}`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me to remind you..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-800 dark:text-neutral-200 placeholder-neutral-400"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isProcessing}
                  className="p-2 bg-blue-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      {!isOpen && !isPillMode && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center relative group"
        >
          <Bell className="w-6 h-6" />
          {reminders.length > 0 && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white dark:border-neutral-900 rounded-full"></span>
          )}
        </motion.button>
      )}

      {/* Central Triggered Reminder Dialog */}
      <AnimatePresence>
        {triggeredReminder && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xl px-4">
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-white/20 dark:border-neutral-800 rounded-[2rem] shadow-[0_0_40px_rgba(239,68,68,0.15)] max-w-sm w-full overflow-hidden text-center flex flex-col items-center p-8 relative"
            >
              {/* Glowing background orb behind the icon */}
              <div className="absolute top-10 w-32 h-32 bg-red-500/20 blur-3xl rounded-full"></div>

              <div className="relative z-10 flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full shadow-lg shadow-red-500/30 mb-6 animate-pulse">
                <Bell className="w-10 h-10 text-white" />
              </div>
              <h2 className="relative z-10 text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">Reminder!</h2>
              <p className="relative z-10 text-neutral-600 dark:text-neutral-300 mb-8 text-lg font-medium">{triggeredReminder.title}</p>
              
              <div className="relative z-10 flex w-full flex-col sm:flex-row gap-3">
                {!mathChallenge ? (
                  <>
                    <button
                      onClick={onInitiateDismiss}
                      className="flex-1 py-3.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold rounded-2xl transition-all active:scale-95 border border-transparent dark:border-neutral-700"
                    >
                      Dismiss
                    </button>
                    {triggeredReminder.snoozable && (
                      <button
                        onClick={() => handleSnoozeReminder(triggeredReminder._id)}
                        className="flex-1 py-3.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold rounded-2xl shadow-md transition-all active:scale-95"
                      >
                        Snooze
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex-1 py-3.5 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold rounded-2xl border border-transparent dark:border-neutral-700">
                      {mathChallenge.text}
                    </div>
                    <input
                      type="number"
                      autoFocus
                      placeholder="Answer..."
                      value={mathAnswer}
                      onChange={(e) => setMathAnswer(e.target.value)}
                      className="flex-1 w-full py-3.5 px-4 bg-white dark:bg-neutral-900 border-2 border-red-500 focus:border-red-600 outline-none text-center text-neutral-900 dark:text-white font-semibold rounded-2xl transition-all"
                    />
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
