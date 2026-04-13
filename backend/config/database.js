const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    const dbName = process.env.DB_NAME;
    
    if (!mongoUrl || !dbName) {
      throw new Error('MONGO_URL and DB_NAME environment variables are required');
    }

    const conn = await mongoose.connect(`${mongoUrl}/${dbName}`);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for better query performance
    await createIndexes();
    
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const User = mongoose.model('User');
    const Snippet = mongoose.model('Snippet');
    const History = mongoose.model('History');
    const LoginAttempt = mongoose.model('LoginAttempt');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    
    // Snippet indexes
    await Snippet.collection.createIndex({ user_id: 1, updated_at: -1 });
    
    // History indexes
    await History.collection.createIndex({ user_id: 1, created_at: -1 });
    
    // Login attempt indexes
    await LoginAttempt.collection.createIndex({ identifier: 1 });
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error.message);
  }
};

module.exports = connectDB;
