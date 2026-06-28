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

  const [triggerSource, setTriggerSource] = useState('floating_mic');

  const toggleListening = (source = 'floating_mic') => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    setTriggerSource(source);
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setTranscript('');
      if (window.innerWidth >= 1024) {
        toast.success("Voice Assistant paused.", { icon: '⏸️', id: 'voice-toast' });
      }
    } else {
      try {
        recognitionRef.current?.start();
      } catch(e) {}
      setIsListening(true);
      setTranscript(''); // Clear old transcripts when waking up
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
      const localTime = new Date().toLocaleString('en-US');
      const offsetMinutes = new Date().getTimezoneOffset();
      const sign = offsetMinutes > 0 ? '-' : '+';
      const absOffset = Math.abs(offsetMinutes);
      const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
      const minutes = String(absOffset % 60).padStart(2, '0');
      const timezoneOffset = `${sign}${hours}:${minutes}`;

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/voice/process`, {
        message: commandText,
        localTime,
        timezoneOffset,
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

  useEffect(() => {
    const handleToggleEvent = (e) => toggleListening(e.detail?.source || 'floating_mic');
    window.addEventListener('toggle_global_voice', handleToggleEvent);
    return () => window.removeEventListener('toggle_global_voice', handleToggleEvent);
  }, [isListening]);

  if (!isAuthenticated || location.pathname === '/auth' || location.pathname === '/settings') {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed z-[10000] pointer-events-auto bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-4 rounded-2xl shadow-2xl w-[90vw] max-w-sm md:max-w-md backdrop-blur-xl border border-white/10 ${
              triggerSource === 'input_mic' 
                ? 'bottom-[90px] left-4 sm:left-1/2 sm:-translate-x-[360px] origin-bottom-left' 
                : 'bottom-[84px] right-6 origin-bottom-right'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-blue-500 animate-pulse" />
              )}
              <span className="text-xs font-bold tracking-widest uppercase text-blue-500">
                LasminAI Assistant {isProcessing && <span className="text-gray-400 normal-case tracking-normal ml-1">(Thinking...)</span>}
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
                      : <code className="font-mono" {...props} />,
                    a: ({node, ...props}) => <a className="text-blue-500 hover:text-blue-400 underline cursor-pointer" target="_blank" rel="noopener noreferrer" {...props} />
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
          onClick={() => toggleListening('floating_mic')}
          className={`fixed bottom-6 right-6 pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center z-[9999] cursor-pointer ${
          isListening 
            ? 'bg-red-500 border border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse transition-all duration-200' 
            : 'bg-blue-600/40 backdrop-blur-md border border-blue-400/30 text-white shadow-lg shadow-blue-600/20 transition-all duration-200'
        }`}
        >
          <Mic className={`w-6 h-6 ${isListening ? 'animate-pulse' : ''}`} />
        </motion.button>
      )}
    </>
  );
}
