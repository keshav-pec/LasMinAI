import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mic, ShieldAlert, BrainCircuit } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import CalendarWidget from '../components/CalendarWidget';
import RemindersDashboard from '../components/RemindersDashboard';

export default function Home({ isAuthenticated }) {
  const { tasks, handleToggleComplete } = useTasks(isAuthenticated);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex flex-col items-center justify-center relative overflow-hidden px-6 bg-white dark:bg-[#131314]">
      
      {/* Static Mesh Gradients for Performance */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-slate-600/20 dark:bg-slate-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-7xl text-center z-10 w-full">
        
        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-neutral-900 dark:text-white mt-8">
          LasMin
          <span className="text-blue-600 dark:text-blue-500">
            AI
          </span>
        </motion.h1>

        <motion.p variants={itemVariants} className="text-lg text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Stop missing deadlines. LasMinAI autonomously restructures your Google Calendar to ensure execution.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isAuthenticated ? (
            <>
              <Link to="/task-prompter" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-medium transition-all shadow-lg shadow-blue-600/20 cursor-pointer">
                Launch Task Prompter
              </Link>
              <Link to="/work-station" className="flex items-center gap-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 px-8 py-4 rounded-full font-medium transition-all shadow-lg cursor-pointer">
                Enter Work Station
              </Link>
            </>
          ) : (
            <Link to="/auth" className="flex items-center gap-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 px-8 py-4 rounded-full font-medium transition-all cursor-pointer">
              Initialize Connection
            </Link>
          )}
        </motion.div>

        {/* Dashboard Grid for Authenticated Users */}
        {isAuthenticated && (
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full mt-16 max-w-7xl mx-auto text-left items-start"
          >
            {/* Left: Reminders Dashboard */}
            <div className="w-full">
              <RemindersDashboard />
            </div>

            {/* Right: Calendar Widget */}
            <div className="w-full">
              <CalendarWidget tasks={tasks} handleToggleComplete={handleToggleComplete} />
            </div>
          </motion.div>
        )}

        {/* Feature Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left pb-10">
          {[
             { icon: Mic, title: "Global Voice Assistant", desc: "Control the app with voice commands from anywhere and magically autofill forms on any website using our Chrome Extension.", delay: 0 },
             { icon: ShieldAlert, title: "Focus Mode & Reminders", desc: "Enforce productivity with full-screen blocking overlays, alert sounds, and math-puzzle dismissals.", delay: 0.2 },
             { icon: BrainCircuit, title: "AI Task Prompter", desc: "Interact with AI to break down complex goals into actionable step-by-step blueprints via our Generative UI.", delay: 0.4 }
          ].map((feature, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5, rotate: 1, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="p-6 min-h-[180px] rounded-2xl bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] hover:border-blue-400/50 dark:hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">{feature.title}</h3>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}