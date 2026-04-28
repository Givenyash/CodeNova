const History = require('../models/History');

// Get execution history for current user
exports.getHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const history = await History.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .limit(limit);
    
    res.json({
      success: true,
      count: history.length,
      data: history.map(h => ({
        id: h._id.toString(),
        code: h.code,
        language: h.language,
        stdout: h.stdout,
        stderr: h.stderr,
        status: h.status,
        execution_time: h.execution_time,
        created_at: h.created_at.toISOString()
      }))
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get history' 
    });
  }
};

// Clear all execution history for current user
exports.clearHistory = async (req, res) => {
  try {
    await History.deleteMany({ user_id: req.user.id });
    
    res.json({ 
      success: true,
      message: 'History cleared successfully' 
    });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to clear history' 
    });
  }
};

// Delete a single history entry
exports.deleteHistoryEntry = async (req, res) => {
  try {
    const result = await History.deleteOne({ 
      _id: req.params.id, 
      user_id: req.user.id 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'History entry not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'History entry deleted successfully' 
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false,
        message: 'History entry not found' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete history entry' 
    });
  }
};
