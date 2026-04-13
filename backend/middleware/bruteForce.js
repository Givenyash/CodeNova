const LoginAttempt = require('../models/LoginAttempt');

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Check if user is locked out due to too many failed attempts
const checkBruteForce = async (email, ip) => {
  const identifier = `${ip}:${email}`;
  const attempt = await LoginAttempt.findOne({ identifier });
  
  if (attempt && attempt.count >= MAX_ATTEMPTS) {
    if (attempt.lockout_until && new Date() < attempt.lockout_until) {
      return true; // Still locked out
    } else {
      // Lockout expired, delete the record
      await LoginAttempt.deleteOne({ identifier });
    }
  }
  
  return false;
};

// Record a failed login attempt
const recordFailedLogin = async (email, ip) => {
  const identifier = `${ip}:${email}`;
  const attempt = await LoginAttempt.findOne({ identifier });
  
  if (attempt) {
    const newCount = attempt.count + 1;
    const update = { count: newCount };
    
    if (newCount >= MAX_ATTEMPTS) {
      update.lockout_until = new Date(Date.now() + LOCKOUT_DURATION);
    }
    
    await LoginAttempt.updateOne({ identifier }, update);
  } else {
    await LoginAttempt.create({ 
      identifier, 
      count: 1 
    });
  }
};

// Clear failed login attempts after successful login
const clearFailedLogins = async (email, ip) => {
  const identifier = `${ip}:${email}`;
  await LoginAttempt.deleteOne({ identifier });
};

module.exports = {
  checkBruteForce,
  recordFailedLogin,
  clearFailedLogins
};
