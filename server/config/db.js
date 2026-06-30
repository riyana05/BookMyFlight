/**
 * MongoDB Atlas Connection
 * ─────────────────────────
 * Connects to MongoDB Atlas using Mongoose.
 * The connection string lives in process.env.MONGODB_URI (see .env.example).
 *
 * The server still starts even if MongoDB isn't configured/reachable —
 * the JSON-file features (deals/bookings) keep working either way, and
 * only the email-login/account routes depend on this connection.
 */

const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('⚠  MONGODB_URI is not set — email login & user accounts will be unavailable.');
    console.warn('   Add MONGODB_URI to your .env file (see .env.example) to enable them.');
    return;
  }

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB Atlas connected');
  });
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠  MongoDB disconnected');
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
  } catch (err) {
    console.error('❌ Could not connect to MongoDB Atlas:', err.message);
  }
}

function isDbConnected() {
  return mongoose.connection.readyState === 1; // 1 = connected
}

module.exports = { connectDB, isDbConnected };
