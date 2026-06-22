import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, Zap } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function TaskPrompter({ userData }) {
  const [messages, setMessages] = useState([
    { 
      id: 'system-init', 
      role: 'ai', 
      content: `System initialized. Ready to sync your deadlines, ${userData?.given_name || 'Keshav'}. What task are we prioritizing today?` 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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
    
    // Grab context history
    const historyContext = messages.slice(-6).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Reset input and height
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // FIX: Generate truly unique IDs to prevent the bubble overwrite bug
    const uniqueUserId = `user-${Date.now()}-${Math.random()}`;
    const uniqueLoadingId = `ai-${Date.now()}-${Math.random()}`;

    // FIX: Batch the state update so the User and AI messages mount sequentially
    setMessages((prev) => [
      ...prev, 
      { id: uniqueUserId, role: 'user', content: userText },
      { id: uniqueLoadingId, role: 'ai', content: '*Processing...*' }
    ]);

    try {
      const response = await axios.post('http://localhost:5050/api/chat', { 
        message: userText,
        history: historyContext
      });
      
      if (response.data.success) {
        setMessages((prev) => 
          prev.map(msg => msg.id === uniqueLoadingId ? { ...msg, content: response.data.reply } : msg)
        );
      }
    } catch (error) {
      setMessages((prev) => 
        prev.map(msg => msg.id === uniqueLoadingId ? { ...msg, content: "**Error connecting to LasMinAI core.**" } : msg)
      );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-73px)] bg-white dark:bg-[#131314] text-neutral-900 dark:text-neutral-100 overflow-hidden relative">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ opacity: [0.02, 0.04, 0.02], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500 blur-[120px]"
        />
      </div>

      <main className="flex-1 overflow-y-auto gemini-scrollbar p-4 sm:p-6 z-10">
        <div className="max-w-3xl mx-auto space-y-8 mt-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
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

      {/* Input Bar (Disclaimer Removed) */}
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
              title="Voice Input"
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
              placeholder="Ask LasMinAI to log a task or schedule..."
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
  );
}