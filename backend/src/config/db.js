import mongoose from 'mongoose';

/**
 * Connects to MongoDB database using Mongoose
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/healthvault');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Process exit on failure in non-test environment
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};
