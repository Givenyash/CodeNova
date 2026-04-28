const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  user_id: { 
    type: String, 
    required: true,
    index: true
  },
  code: { 
    type: String, 
    required: true 
  },
  language: { 
    type: String, 
    default: 'python' 
  },
  stdout: { 
    type: String, 
    default: '' 
  },
  stderr: { 
    type: String, 
    default: '' 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['success', 'error', 'timeout']
  },
  execution_time: { 
    type: Number, 
    required: true 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Index for faster queries
historySchema.index({ user_id: 1, created_at: -1 });

// TTL index to auto-delete old records after 30 days (optional)
// historySchema.index({ created_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('History', historySchema);
