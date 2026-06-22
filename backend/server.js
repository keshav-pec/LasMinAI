const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// --- NEW ROUTE IMPORTS ---
const aiRoutes = require('./routes/aiRoutes');

// --- ROUTE MIDDLEWARE ---
app.use('/api/ai', aiRoutes);

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'LasMinAI server is active and breathing.' });
});

// We will import our Task routes here shortly...

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});