const Snippet = require('../models/Snippet');

// Create a new snippet
exports.createSnippet = async (req, res) => {
  try {
    const { name, code, language = 'python' } = req.body;
    
    // Validate input
    if (!name || !code) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and code are required' 
      });
    }
    
    // Create snippet
    const snippet = await Snippet.create({
      user_id: req.user.id,
      name: name.trim(),
      code,
      language
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: snippet._id.toString(),
        name: snippet.name,
        code: snippet.code,
        language: snippet.language,
        created_at: snippet.created_at.toISOString(),
        updated_at: snippet.updated_at.toISOString()
      }
    });
  } catch (error) {
    console.error('Create snippet error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to create snippet' 
    });
  }
};

// Get all snippets for current user
exports.getSnippets = async (req, res) => {
  try {
    const snippets = await Snippet.find({ user_id: req.user.id })
      .sort({ updated_at: -1 })
      .limit(100);
    
    res.json({
      success: true,
      count: snippets.length,
      data: snippets.map(s => ({
        id: s._id.toString(),
        name: s.name,
        code: s.code,
        language: s.language,
        created_at: s.created_at.toISOString(),
        updated_at: s.updated_at.toISOString()
      }))
    });
  } catch (error) {
    console.error('Get snippets error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get snippets' 
    });
  }
};

// Get a single snippet by ID
exports.getSnippet = async (req, res) => {
  try {
    const snippet = await Snippet.findOne({ 
      _id: req.params.id, 
      user_id: req.user.id 
    });
    
    if (!snippet) {
      return res.status(404).json({ 
        success: false,
        message: 'Snippet not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        id: snippet._id.toString(),
        name: snippet.name,
        code: snippet.code,
        language: snippet.language,
        created_at: snippet.created_at.toISOString(),
        updated_at: snippet.updated_at.toISOString()
      }
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false,
        message: 'Snippet not found' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to get snippet' 
    });
  }
};

// Update a snippet
exports.updateSnippet = async (req, res) => {
  try {
    const { name, code, language } = req.body;
    
    // Validate input
    if (!name || !code) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and code are required' 
      });
    }
    
    const snippet = await Snippet.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { 
        name: name.trim(), 
        code, 
        language,
        updated_at: new Date() 
      },
      { new: true, runValidators: true }
    );
    
    if (!snippet) {
      return res.status(404).json({ 
        success: false,
        message: 'Snippet not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        id: snippet._id.toString(),
        name: snippet.name,
        code: snippet.code,
        language: snippet.language,
        created_at: snippet.created_at.toISOString(),
        updated_at: snippet.updated_at.toISOString()
      }
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false,
        message: 'Snippet not found' 
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to update snippet' 
    });
  }
};

// Delete a snippet
exports.deleteSnippet = async (req, res) => {
  try {
    const result = await Snippet.deleteOne({ 
      _id: req.params.id, 
      user_id: req.user.id 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Snippet not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Snippet deleted successfully' 
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false,
        message: 'Snippet not found' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete snippet' 
    });
  }
};
