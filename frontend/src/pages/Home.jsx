import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Calendar, BrainCircuit, ArrowRight } from 'lucide-react';

export default function Home({ isAuthenticated }) {
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
      
      {/* Pure Blue/Grey Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-4xl text-center z-10">
        
        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-neutral-900 dark:text-white mt-8">
          The Last-Minute <br />
          <span className="text-blue-600 dark:text-blue-500">
            Life Saver.
          </span>
        </motion.h1>

        <motion.p variants={itemVariants} className="text-lg text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Stop missing deadlines. LasMinAI autonomously restructures your Google Calendar to ensure execution.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isAuthenticated ? (
            <>
              <Link to="/task-prompter" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-medium transition-all shadow-lg shadow-blue-600/20">
                Launch Task Prompter
              </Link>
              <Link to="/work-station" className="flex items-center gap-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 px-8 py-4 rounded-full font-medium transition-all shadow-lg">
                Enter Work Station
              </Link>
            </>
          ) : (
            <Link to="/auth" className="flex items-center gap-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 px-8 py-4 rounded-full font-medium transition-all">
              Initialize Connection
            </Link>
          )}
        </motion.div>

        {/* Feature Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left pb-10">
          {[
             { icon: BrainCircuit, title: "Algorithmic Routing", desc: "Prioritizes tasks using mathematical complexity and effort weighting." },
             { icon: Calendar, title: "Autonomous Sync", desc: "Pushes optimized time-blocks directly to your Google Calendar." },
             { icon: Zap, title: "Agentic Execution", desc: "Generates cognitive break schedules and technical execution strategies." }
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-2xl bg-neutral-50 dark:bg-[#1E1F20] border border-neutral-200 dark:border-neutral-800">
              <feature.icon className="w-6 h-6 text-blue-500 mb-4" />
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}