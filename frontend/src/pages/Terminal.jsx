import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, Zap, User } from 'lucide-react';

export default function Terminal() {
  // Initial state with a personalized greeting
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      role: 'ai', 
      content: 'LasMinAI initialized. Ready to sync your deadlines, Keshav. What are we tackling first?' 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  
  // Auto-scroll ref
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle temporary local message submission
  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newUserMsg = { id: Date.now(), role: 'user', content: inputValue };
    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue('');

    // Simulate AI thinking (We will wire this to your backend next)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev, 
        { id: Date.now() + 1, role: 'ai', content: 'Processing commitment parameters...' }
      ]);
    }, 600);
  };

  return (
    <div className="min-h-screen dark:bg-neutral-950 bg-neutral-50 dark:text-neutral-200 text-neutral-800 font-sans flex flex-col selection:bg-blue-500/30 transition-colors duration-300">
      
      {/* Subtle Ambient Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]"
        />
        <motion.div 
          animate={{ opacity: [0.1, 0.15, 0.1], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-900/10 blur-[120px]"
        />
      </div>

      {/* Header */}
      <header className="py-4 px-6 flex items-center gap-2 border-b dark:border-white/5 border-neutral-200 z-10 dark:bg-neutral-950/50 bg-white/50 backdrop-blur-md">
        <Zap className="w-5 h-5 text-blue-500" />
        <h1 className="font-semibold tracking-wide text-sm dark:text-neutral-300 text-neutral-700">LasMinAI / Terminal</h1>
      </header>

      {/* Chat History Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 z-10 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'dark:bg-neutral-800 bg-neutral-200 border dark:border-neutral-700 border-neutral-300 text-blue-500'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[80%] px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-50 rounded-tr-sm' 
                  : 'dark:bg-neutral-900/80 bg-white border dark:border-neutral-800 border-neutral-200 dark:text-neutral-300 text-neutral-700 rounded-tl-sm shadow-sm'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Floating Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 z-20 bg-gradient-to-t dark:from-neutral-950 dark:via-neutral-950/80 to-transparent from-neutral-50 via-neutral-50/80">
        <div className="max-w-3xl mx-auto">
          <form 
            onSubmit={handleSend}
            className="flex items-end gap-2 dark:bg-neutral-900/90 bg-white border dark:border-neutral-800 border-neutral-200 p-2 rounded-3xl shadow-2xl backdrop-blur-xl dark:focus-within:border-neutral-700 focus-within:border-neutral-400 transition-colors"
          >
            {/* Future Voice Placeholder */}
            <button 
              type="button" 
              className="p-3 text-neutral-400 hover:text-blue-500 dark:hover:bg-neutral-800/50 hover:bg-neutral-100 rounded-full transition-colors shrink-0"
              title="Voice Input (Coming Soon)"
            >
              <Mic className="w-5 h-5" />
            </button>

            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="e.g., Log a high-complexity OS lab assignment due Friday..."
              className="flex-1 bg-transparent border-none focus:outline-none resize-none max-h-32 py-3 px-2 dark:text-neutral-200 text-neutral-800 placeholder:dark:text-neutral-600 placeholder:text-neutral-400 custom-scrollbar"
              rows={1}
            />

            <button 
              type="submit"
              disabled={!inputValue.trim()}
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shrink-0 shadow-lg shadow-blue-900/20"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}