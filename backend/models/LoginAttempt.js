const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  identifier: { 
    type: String, 
    required: true,
    index: true
  },
  count: { 
    type: Number, 
    default: 1 
  },
  lockout_until: { 
    type: Date 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// TTL index to auto-delete old records after 1 hour
loginAttemptSchema.index({ created_at: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
