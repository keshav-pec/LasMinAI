import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Zap, User, Settings, LogOut, Terminal as TerminalIcon } from 'lucide-react';

export default function Navbar({ userData, setUserData }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Close menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // In a full production app, you'd hit a backend /logout route to destroy the session.
    // For this prototype, we clear the local state and redirect.
    setUserData(null);
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="py-4 px-6 flex items-center justify-between border-b border-neutral-200 dark:border-white/5 z-50 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0">
      <Link to="/" className="flex items-center gap-2 group">
        <Zap className="w-5 h-5 text-blue-600 dark:text-blue-500 group-hover:scale-110 transition-transform" />
        <h1 className="font-semibold tracking-wide text-sm text-neutral-900 dark:text-neutral-300">LasMinAI</h1>
      </Link>

      <div className="flex items-center gap-4">
        <button onClick={() => setIsDark(!isDark)} className="p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-blue-400 dark:hover:bg-neutral-800/50 rounded-full transition-colors relative">
          <motion.div initial={false} animate={{ rotate: isDark ? 0 : 180, scale: isDark ? 1 : 0 }} className="absolute inset-0 flex items-center justify-center"><Moon className="w-4 h-4" /></motion.div>
          <motion.div initial={false} animate={{ rotate: isDark ? -180 : 0, scale: isDark ? 0 : 1 }} className="flex items-center justify-center"><Sun className="w-4 h-4" /></motion.div>
        </button>

        {userData ? (
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <img src={userData.picture} alt="Profile" className="w-9 h-9 rounded-full border-2 border-transparent hover:border-blue-500 transition-colors object-cover cursor-pointer" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{userData.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{userData.email}</p>
                  </div>
                  <div className="p-2">
                    <Link to="/task-prompter" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                      <TerminalIcon className="w-4 h-4" /> Task Prompter
                    </Link>
                    <button onClick={() => setIsMenuOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-left">
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-left mt-1">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <Link to="/auth" className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-blue-200 dark:hover:text-white transition-colors">
            <User className="w-4 h-4" />
          </Link>
        )}
      </div>
    </header>
  );
}