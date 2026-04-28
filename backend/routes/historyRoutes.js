const express = require('express');
const router = express.Router();
const { getHistory, clearHistory, deleteHistoryEntry } = require('../controllers/historyController');
const { authenticateToken } = require('../middleware/auth');

// All history routes require authentication
router.get('/', authenticateToken, getHistory);
router.delete('/', authenticateToken, clearHistory);
router.delete('/:id', authenticateToken, deleteHistoryEntry);

module.exports = router;
