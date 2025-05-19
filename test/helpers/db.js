const mongoose = require('mongoose');

/**
 * Connect to the test database
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
};

/**
 * Clear all collections in the test database
 */
const clearDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};

/**
 * Disconnect from the test database
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

module.exports = {
  connectDB,
  clearDatabase,
  disconnectDB
}; 