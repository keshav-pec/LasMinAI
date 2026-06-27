const express = require('express');
const router = express.Router();
const { requireAuth } = require('../utils/authMiddleware');
const { getHabits, createHabit, deleteHabit, getHeatmapData } = require('../controllers/habitController');

// All habit routes require authentication
router.use(requireAuth);

router.get('/', getHabits);
router.post('/', createHabit);
router.delete('/:id', deleteHabit);
router.get('/heatmap', getHeatmapData);

module.exports = router;
