import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Zap, User, Settings, LogOut, Terminal as TerminalIcon, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar({ userData, setUserData }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => localStorage.getItem('pwaInstalled') === '1');
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

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

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      localStorage.setItem('pwaInstalled', '1');
      setIsInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const isHomeOrAuth = location.pathname === '/' || location.pathname === '/auth';

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5050/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' 
      });
      toast.success("Successfully logged out.");
    } catch (error) {
      toast.error('Logout failed.');
    }
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

      {/* Center Tabs */}
      {!isHomeOrAuth && userData && (
        <div className="flex items-center gap-1 sm:gap-2 absolute left-1/2 -translate-x-1/2 bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-full">
          <Link 
            to="/task-prompter" 
            className={`px-3 sm:px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${location.pathname === '/task-prompter' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
          >
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4" /> <span className="hidden sm:inline">Prompter</span>
            </div>
          </Link>
          <Link 
            to="/work-station" 
            className={`px-3 sm:px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${location.pathname === '/work-station' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" /> <span className="hidden sm:inline">Work Station</span>
            </div>
          </Link>
        </div>
      )}

      <div className="flex items-center gap-4">
        {isHomeOrAuth && isInstalled && (
          <button 
            onClick={() => toast.success("LasMinAI is installed! Launch it from your home screen.", { icon: '🚀' })} 
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-full transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Open in App</span>
          </button>
        )}
        {isHomeOrAuth && !isInstalled && deferredPrompt && (
          <button 
            onClick={handleInstallClick} 
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-full transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

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