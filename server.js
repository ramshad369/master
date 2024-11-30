// server.js

import express, { json } from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import setupRoutes from './routes/allRoutes.js'
// Load environment variables
config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(json()); // To parse JSON requests

// Connect to MongoDB
connectDB();

// Setup Routes
setupRoutes(app); // Load all routes using the route loader
// Default Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the API!' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
