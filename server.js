// server.js

import express, { json } from "express";
import { config } from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import setupRoutes from "./routes/allRoutes.js";
import Order from "./models/order.js";
import Stripe from "stripe";
import User from "./models/User.js";
import {sendEmail } from "./utils/otpHelper.js";
// Load environment variables
config();
const stripe = new Stripe(process.env.STRIPE_KEY);
// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.WEBHOOK_KEY
      );
      console.log("Webhook received:", event.type);

      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;
        const paymentIntentObj = await stripe.paymentIntents.retrieve(
          paymentIntentId
        );
        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentIntentObj.payment_method
        );
        const orderId = paymentIntent.metadata.orderId;
        const order = await Order.findById(orderId);
        order.paymentStatus = "success";
        order.status = "paid";
        order.paymentIntentId = paymentIntent.id;
        order.paymentMethod = paymentMethod.type;
        await order.save();
        const userDetails = await User.findById(paymentIntent.metadata.userId).select("-password");
        const subject = "Payment Success - Order Placed";
        const text = `Your payment was successful. Your order (ID: ${orderId}) is confirmed.`;
        await sendEmail(userDetails.email, subject, text);
      } else if (event.type === "payment_intent.failed") {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.payment_intent;
        const paymentIntentObj = await stripe.paymentIntents.retrieve(
          paymentIntentId
        );
        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentIntentObj.payment_method
        );
        const orderId = paymentIntent.metadata.orderId;
        const order = await Order.findById(orderId);
        order.paymentStatus = "failed";
        order.status = "cancelled";
        order.paymentIntentId = paymentIntent.id;
        order.paymentMethod = paymentMethod.type;
        await order.save();
      }
      res.sendStatus(200); // Respond to Stripe webhook
    } catch (err) {
      console.error("Webhook error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);
app.use(json()); // To parse JSON requests

// Connect to MongoDB
connectDB();

// Setup Routes
setupRoutes(app); // Load all routes using the route loader
// Default Route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the API!" });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
