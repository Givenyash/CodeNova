const express = require('express');
const router = express.Router();
const {
  createSnippet,
  getSnippets,
  getSnippet,
  updateSnippet,
  deleteSnippet
} = require('../controllers/snippetController');
const { authenticateToken } = require('../middleware/auth');

// All snippet routes require authentication
router.post('/', authenticateToken, createSnippet);
router.get('/', authenticateToken, getSnippets);
router.get('/:id', authenticateToken, getSnippet);
router.put('/:id', authenticateToken, updateSnippet);
router.delete('/:id', authenticateToken, deleteSnippet);

module.exports = router;
