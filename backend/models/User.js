const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true, 
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password_hash: { 
    type: String, 
    required: [true, 'Password is required'] 
  },
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true 
  },
  role: { 
    type: String, 
    default: 'user',
    enum: ['user', 'admin']
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password_hash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

// Remove password_hash from JSON responses
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password_hash;
  return user;
};

module.exports = mongoose.model('User', userSchema);
