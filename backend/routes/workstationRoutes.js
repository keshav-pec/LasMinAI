const express = require('express');
const router = express.Router();
const workstationController = require('../controllers/workstationController');
const { requireAuth } = require('../utils/authMiddleware');

// Protect the route with requireAuth
router.post('/chat', requireAuth, workstationController.handleWorkstationChat);

module.exports = router;
