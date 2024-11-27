// config/db.js

import { connect } from 'mongoose';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const connectDB = async () => {
  try {
    // MongoDB connection string
    const conn = await connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit the process with failure
  }
};

export default connectDB;
