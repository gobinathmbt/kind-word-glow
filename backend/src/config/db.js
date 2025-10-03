
const mongoose = require('mongoose');
const Env_Configuration = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(Env_Configuration.MONGODB_URI, {
      maxPoolSize: 20,              // optional: handle concurrency
      serverSelectionTimeoutMS: 5000, // retry limit for initial connect
      socketTimeoutMS: 45000,         // drop idle sockets
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`);
    
    // Exit only in production, so dev isn't annoying
    if (Env_Configuration.NODE_ENV === "production") {
      process.exit(1);
    }
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB error: ${err.message}`);
});

module.exports = connectDB;
