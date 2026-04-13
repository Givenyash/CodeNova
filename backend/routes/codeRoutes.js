const express = require('express');
const router = express.Router();
const { runCode } = require('../controllers/codeController');
const { authenticateToken } = require('../middleware/auth');

// All code execution routes require authentication
router.post('/run-code', authenticateToken, runCode);

module.exports = router;
