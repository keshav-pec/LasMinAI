import { motion } from 'framer-motion';
import { Zap, ShieldCheck } from 'lucide-react';

export default function Auth() {
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5050/api/auth/google';
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center relative overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ x: [-20, 20, -20], y: [-20, 20, -20], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-blue-500/20 dark:bg-blue-600/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ x: [20, -20, 20], y: [20, -20, 20], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-indigo-500/20 dark:bg-indigo-600/10 rounded-full blur-[120px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] p-8 mx-4 bg-white/60 dark:bg-neutral-900/40 border border-neutral-200/50 dark:border-white/5 rounded-3xl shadow-2xl backdrop-blur-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6"
          >
            <Zap className="w-8 h-8 text-white fill-white/20" />
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mb-3">
            Initialize Core
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed px-4">
            Authorize calendar access to enable autonomous scheduling, conflict resolution, and dynamic task routing.
          </p>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 py-4 px-6 rounded-2xl font-semibold transition-all shadow-xl dark:shadow-white/10 group relative overflow-hidden"
        >
          {/* Subtle button gradient sweep on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="relative z-10">Continue with Google</span>
        </motion.button>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-neutral-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>End-to-End OAuth 2.0 Encryption</span>
        </div>
      </motion.div>
    </div>
  );
}