import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Moon, Sun, Zap, User } from 'lucide-react';

export default function Navbar() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });
  
  const [userData, setUserData] = useState(null);

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

  // Check authentication status on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('http://localhost:5050/api/auth/me');
        const data = await response.json();
        if (data.authenticated) {
          setUserData(data.user);
        }
      } catch (error) {
        console.error("Failed to fetch user session");
      }
    };
    fetchUser();
  }, []);

  return (
    <header className="py-4 px-6 flex items-center justify-between border-b border-neutral-200 dark:border-white/5 z-50 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0">
      <Link to="/" className="flex items-center gap-2 group">
        <Zap className="w-5 h-5 text-blue-600 dark:text-blue-500 group-hover:scale-110 transition-transform" />
        <h1 className="font-semibold tracking-wide text-sm text-neutral-900 dark:text-neutral-300">
          LasMinAI
        </h1>
      </Link>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsDark(!isDark)}
          className="p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-blue-400 dark:hover:bg-neutral-800/50 rounded-full transition-colors relative overflow-hidden"
        >
          <motion.div initial={false} animate={{ rotate: isDark ? 0 : 180, scale: isDark ? 1 : 0 }} className="absolute inset-0 flex items-center justify-center">
            <Moon className="w-4 h-4" />
          </motion.div>
          <motion.div initial={false} animate={{ rotate: isDark ? -180 : 0, scale: isDark ? 0 : 1 }} className="flex items-center justify-center">
            <Sun className="w-4 h-4" />
          </motion.div>
        </button>

        {userData ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hidden sm:block">
              {userData.given_name || userData.name}
            </span>
            <img src={userData.picture} alt="Profile" className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700 object-cover shadow-sm" />
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