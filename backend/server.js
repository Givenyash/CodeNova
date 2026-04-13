require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const codeRoutes = require('./routes/codeRoutes');
const snippetRoutes = require('./routes/snippetRoutes');
const historyRoutes = require('./routes/historyRoutes');

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Routes
app.get('/api', (req, res) => {
  res.json({ 
    success: true,
    message: 'CodeNOVA API - MERN Stack Backend', 
    version: '2.0.0',
    documentation: '/api/health'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', codeRoutes);
app.use('/api/snippets', snippetRoutes);
app.use('/api/history', historyRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Seed Admin User
const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const existing = await User.findOne({ email: adminEmail });
    
    if (!existing) {
      await User.create({
        email: adminEmail,
        password_hash: adminPassword,
        name: 'Admin',
        role: 'admin'
      });
      console.log(`✓ Admin user created: ${adminEmail}`);
    } else {
      const passwordValid = await existing.comparePassword(adminPassword);
      if (!passwordValid) {
        existing.password_hash = adminPassword;
        await existing.save();
        console.log(`✓ Admin password updated: ${adminEmail}`);
      }
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
};

// Start Server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Seed admin user
    await seedAdmin();
    
    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ CodeNOVA API running on http://0.0.0.0:${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API Documentation: http://0.0.0.0:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
