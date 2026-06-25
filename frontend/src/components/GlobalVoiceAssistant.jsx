import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { broadcastReminderAction } from '../utils/reminderSync';

export default function GlobalVoiceAssistant({ isAuthenticated }) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const location = useLocation();
  
  const isPillMode = location.pathname === '/task-prompter' || location.pathname === '/work-station';
  
  // Computed property: Bubble is open if listening, processing, or showing a transcript
  const isOpen = isListening || isProcessing || transcript.length > 0;
  const recognitionRef = useRef(null);

  // Use a ref for state to avoid stale closures in event listeners (setTimeout)
  const stateRef = useRef({ isProcessing: false });
  const processCommandRef = useRef();
  const silenceTimerRef = useRef(null);

  // Keep ref synchronized with actual state
  useEffect(() => {
    stateRef.current = { isProcessing };
  }, [isProcessing]);

  // Sync state to UI pills
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sync_voice_listening', { detail: isListening }));
  }, [isListening]);

  // Listen for remote toggles from UI pills
  useEffect(() => {
    const handler = () => toggleListening();
    window.addEventListener('toggle_global_voice', handler);
    return () => window.removeEventListener('toggle_global_voice', handler);
  }, [isListening]); // Re-bind so it has latest closure, or use a ref

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        
        silenceTimerRef.current = setTimeout(() => {
          if (processCommandRef.current && !stateRef.current.isProcessing) {
            processCommandRef.current(finalTranscript);
          }
        }, 2000);
      }
    };

    recognitionRef.current.onend = () => {
      // In one-shot mode, we do not auto-restart. 
      // The microphone stays off until explicitly clicked again.
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Empty dependency array so it only mounts once!

  const toggleListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setTranscript('');
      toast.success("Voice Assistant paused.");
    } else {
      try {
        recognitionRef.current?.start();
      } catch(e) {}
      setIsListening(true);
      setTranscript(''); // Clear old transcripts when waking up
      toast.success("Voice Assistant Activated. I'm listening!");
    }
  };

  const processVoiceCommand = async (commandText) => {
    if (!commandText.trim()) return;
    
    // Prevent double-firing if the browser sends multiple isFinal segments before the mic shuts off
    if (stateRef.current.isProcessing) return;

    // Synchronously update the ref so the onend handler doesn't restart it!
    stateRef.current.isProcessing = true;
    setIsProcessing(true);
    
    // Switch to one-shot mode: immediately disable the microphone
    setIsListening(false);

    // Stop listening while processing and speaking to avoid echo loops
    try {
      recognitionRef.current?.stop();
    } catch(e) {}

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localTime = new Date().toLocaleString('en-US', { timeZone: userTimezone });
      
      // Calculate exact offset string (e.g., '+05:30' or '-04:00')
      const offsetMinutes = new Date().getTimezoneOffset();
      const sign = offsetMinutes > 0 ? '-' : '+';
      const absOffset = Math.abs(offsetMinutes);
      const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
      const minutes = String(absOffset % 60).padStart(2, '0');
      const timezoneOffset = `${sign}${hours}:${minutes}`;

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/voice/process`, {
        message: commandText,
        userTimezone,
        localTime,
        timezoneOffset
      }, { withCredentials: true });

      if (response.data.success) {
        setTranscript(response.data.reply);
        
        // Trigger UI Refreshes based on Intent
        if (response.data.intent === 'REMINDER') {
          broadcastReminderAction('FETCH');
        } else {
          window.dispatchEvent(new Event('lasmin_tasks_updated'));
        }
        
        // Play Native TTS 
        const textToSpeak = response.data.replyVoice || response.data.reply;
        
        // Prevent browser freeze if text is empty
        if (!textToSpeak || textToSpeak.trim() === "") {
           stateRef.current.isProcessing = false;
           setIsProcessing(false);
           setTimeout(() => setTranscript(''), 5000);
           return;
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // macOS Chrome sometimes drops the 'onend' event. Force a reset after 15 seconds if stuck.
        const fallbackTimeout = setTimeout(() => {
          if (stateRef.current.isProcessing) {
            stateRef.current.isProcessing = false;
            setIsProcessing(false);
          }
        }, 15000);

        utterance.onend = () => {
          clearTimeout(fallbackTimeout);
          stateRef.current.isProcessing = false;
          setIsProcessing(false);
          setTimeout(() => setTranscript(''), 5000);
        };
        
        utterance.onerror = () => {
          clearTimeout(fallbackTimeout);
          stateRef.current.isProcessing = false;
          setIsProcessing(false);
          setTimeout(() => setTranscript(''), 5000);
        };

        window.speechSynthesis.speak(utterance);
      } else {
        throw new Error("Backend parsing failed");
      }
    } catch (error) {
      console.error("Voice processing error", error);
      stateRef.current.isProcessing = false;
      setIsProcessing(false);
      setTranscript("Sorry, I encountered an error.");
    }
  };

  processCommandRef.current = processVoiceCommand;



  processCommandRef.current = processVoiceCommand;

  if (!isAuthenticated || location.pathname === '/auth') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-4 rounded-2xl shadow-2xl w-auto max-w-sm md:max-w-md backdrop-blur-xl border border-white/10"
          >
            <div className="flex items-center gap-2 mb-2">
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-blue-500 animate-pulse" />
              )}
              <span className="text-xs font-bold tracking-widest uppercase text-blue-500">
                LasMin Voice {isProcessing && <span className="text-gray-400 normal-case tracking-normal ml-1">(Thinking...)</span>}
              </span>
            </div>
            <div className="text-sm font-medium leading-relaxed max-h-[50vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {transcript ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-blue-400 dark:text-blue-600" {...props} />,
                    pre: ({node, ...props}) => <pre className="bg-neutral-800 dark:bg-neutral-100 text-neutral-200 dark:text-neutral-800 p-2 rounded-lg my-2 overflow-x-auto text-xs font-mono" {...props} />,
                    code: ({node, inline, ...props}) => inline 
                      ? <code className="bg-neutral-800 dark:bg-blue-50 text-blue-300 dark:text-blue-600 px-1.5 py-0.5 rounded-md text-xs font-semibold" {...props} />
                      : <code className="font-mono" {...props} />
                  }}
                >
                  {transcript}
                </ReactMarkdown>
              ) : (
                "Listening..."
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isPillMode && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleListening}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all border ${
            isListening 
              ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]' 
              : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          {isListening ? (
            <Mic className="w-6 h-6 animate-pulse" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </motion.button>
      )}
    </div>
  );
}
