require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { router: authRoutes } = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const taskRoutes = require('./routes/taskRoutes');
const workstationRoutes = require('./routes/workstationRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const autofillRoutes = require('./routes/autofillRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
const habitRoutes = require('./routes/habitRoutes');
const extensionRoutes = require('./routes/extensionRoutes');
const { startEmailWorker } = require('./services/emailWorker');
const { startZombieSweeper } = require('./services/zombieSweeper');

const app = express();
app.set('trust proxy', 1); // Trust the first proxy (Render) to correctly identify client IPs for rate limiting

const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_URL = isProduction ? process.env.FRONTEND_URL : 'http://localhost:5174';

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || origin === FRONTEND_URL || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' })); // Parses incoming JSON requests with a size limit
app.use(cookieParser());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB Atlas connected successfully'))
.catch((err) => console.error('❌ MongoDB connection error:', err));



const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // Limit each IP to 15 requests per windowMs (matches Gemini 3.1 Flash Lite quota)
  message: { success: false, error: 'Too many requests to the AI engine, please try again after a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const { aiQueueMiddleware } = require('./utils/aiQueueMiddleware');

app.use('/api/tasks', taskRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cron', require('./routes/cronRoutes'));
app.use('/api/chat', aiLimiter, aiQueueMiddleware, chatRoutes);
app.use('/api/workstation', aiLimiter, aiQueueMiddleware, workstationRoutes);
app.use('/api/reminders/chat', aiLimiter, aiQueueMiddleware); // Strict rate limit for AI
app.use('/api/voice', aiLimiter, aiQueueMiddleware, voiceRoutes);
app.use('/api/autofill', aiLimiter, aiQueueMiddleware, autofillRoutes);
app.use('/api/reminders', generalApiLimiter, reminderRoutes); // General limit for CRUD
app.use('/api/user', generalApiLimiter, userRoutes);
app.use('/api/reports', generalApiLimiter, reportRoutes);
app.use('/api/habits', generalApiLimiter, habitRoutes);
app.use('/api/extension', aiLimiter, aiQueueMiddleware, extensionRoutes);

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'LasMinAI server is active and breathing.' });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Start the background email sweep worker
  startEmailWorker();

  // Start the background zombie sweeper worker
  startZombieSweeper();
});