const mongoose = require('mongoose');

const snippetSchema = new mongoose.Schema({
  user_id: { 
    type: String, 
    required: true,
    index: true
  },
  name: { 
    type: String, 
    required: [true, 'Snippet name is required'],
    trim: true 
  },
  code: { 
    type: String, 
    required: [true, 'Code is required'] 
  },
  language: { 
    type: String, 
    default: 'python',
    enum: ['python', 'javascript', 'java', 'cpp', 'c']
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Update the updated_at field before saving
snippetSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Index for faster queries
snippetSchema.index({ user_id: 1, updated_at: -1 });

module.exports = mongoose.model('Snippet', snippetSchema);
