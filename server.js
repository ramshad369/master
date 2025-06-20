// server.js

import express, { json } from "express";
import { config } from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import setupRoutes from "./routes/allRoutes.js";
import Order from "./models/Order.js";
import Stripe from "stripe";
import User from "./models/User.js";
import Cart from "./models/Cart.js";
import Product from "./models/Product.js";
import {sendEmail } from "./utils/otpHelper.js";
import { sendSuccess, sendError } from "./utils/responseHandler.js";
import { scheduleExchangeRateUpdates } from './cron/updateExchangeRates.js';
// Load environment variables
config();
const stripe = new Stripe(process.env.STRIPE_KEY);
// Initialize Express app
const app = express();

// Middleware
const corsOptions = {
  origin: "http://52.66.237.93:3000", // Frontend's URL
  credentials: true, // Allow cookies and authorization headers
};

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

        //update order
        const orderId = paymentIntent.metadata.orderId;
        const order = await Order.findById(orderId);
        order.paymentStatus = "success";
        order.status = "paid";
        order.paymentIntentId = paymentIntent.id;
        order.paymentMethod = paymentMethod.type;
        await order.save();

        // clear cart
        const cart = await Cart.findOne({
          userId: paymentIntent.metadata.userId,
        });
        if (!cart) return sendError(res, "Cart already empty.", 404);
        cart.items = [];
        await cart.save();

        // 📦 Decrease product stocks
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stocks: -item.quantity },
          });
        }

        //send mail
        const userDetails = await User.findById(
          paymentIntent.metadata.userId
        ).select("-password");
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

scheduleExchangeRateUpdates();

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

