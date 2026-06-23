require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { router: authRoutes } = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5174', // Frontend URL
  credentials: true
}));
app.use(express.json()); // Parses incoming JSON requests
app.use(cookieParser());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB Atlas connected successfully'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// ROUTE IMPORTS
const aiRoutes = require('./routes/aiRoutes');
const taskRoutes = require('./routes/taskRoutes');
const workstationRoutes = require('./routes/workstationRoutes');

// ROUTE MIDDLEWARE
app.use('/api/ai', aiRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/workstation', workstationRoutes);

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'LasMinAI server is active and breathing.' });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});