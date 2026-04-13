const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { createAccessToken, createRefreshToken, setAuthCookies, clearAuthCookies } = require('../middleware/tokenHelper');
const { checkBruteForce, recordFailedLogin, clearFailedLogins } = require('../middleware/bruteForce');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false,
        message: 'Email, password, and name are required' 
      });
    }
    
    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already registered' 
      });
    }
    
    // Create new user (password will be hashed by User model pre-save hook)
    const user = await User.create({
      email: normalizedEmail,
      password_hash: password,
      name: name.trim(),
      role: 'user'
    });
    
    // Generate tokens
    const accessToken = createAccessToken(user._id.toString(), normalizedEmail);
    const refreshToken = createRefreshToken(user._id.toString());
    
    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);
    
    // Return user data (password excluded by toJSON method)
    res.status(201).json({
      success: true,
      data: {
        id: user._id.toString(),
        email: normalizedEmail,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Registration failed' 
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Check brute force protection
    if (await checkBruteForce(normalizedEmail, ip)) {
      return res.status(429).json({ 
        success: false,
        message: 'Too many failed attempts. Please try again in 15 minutes.' 
      });
    }
    
    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user || !(await user.comparePassword(password))) {
      await recordFailedLogin(normalizedEmail, ip);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }
    
    // Clear failed login attempts
    await clearFailedLogins(normalizedEmail, ip);
    
    // Generate tokens
    const accessToken = createAccessToken(user._id.toString(), normalizedEmail);
    const refreshToken = createRefreshToken(user._id.toString());
    
    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);
    
    // Return user data
    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Login failed' 
    });
  }
};

// Logout user
exports.logout = (req, res) => {
  clearAuthCookies(res);
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get user information' 
    });
  }
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refresh_token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Refresh token not found' 
      });
    }
    
    // Verify refresh token
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    if (payload.type !== 'refresh') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token type' 
      });
    }
    
    // Find user
    const user = await User.findById(payload.sub);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Generate new access token
    const accessToken = createAccessToken(user._id.toString(), user.email);
    
    // Set new access token cookie
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });
    
    res.json({ 
      success: true,
      message: 'Token refreshed' 
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Refresh token expired' 
      });
    }
    
    res.status(401).json({ 
      success: false,
      message: 'Invalid refresh token' 
    });
  }
};
