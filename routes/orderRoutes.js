import express from "express";
const router = express.Router();
import Order from "../models/order.js";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_KEY);
import authMiddleware from "../middlewares/authMiddleware.js";
const { authenticateToken, authorizeRole } = authMiddleware;
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import User from "../models/User.js";
import {sendEmail } from "../utils/otpHelper.js";

router.post("/create-checkout-session", authenticateToken, async (req, res) => {
  try {
    const { cartItems, cartId } = req.body;
    const userId = req.user.id;
    console.log("cartItems", cartItems);
    const currentDate = new Date();
    const deliveryDate = new Date(
      currentDate.setDate(currentDate.getDate() + 5)
    );
    // Create the order without payment details first
    const order = new Order({
      user: userId,
      items: cartItems.map((item) => ({
        productId: item.productId._id,
        title: item.productId.title,
        quantity: item.quantity,
        price: item.productId.price,
      })),
      status: "pending",
      deliveryStatus: "pending",
      createdAt: new Date(),
      deliveryDate: deliveryDate,
    });

    await order.save(); // Save the order in the database
    console.log("Order created without payment details:", order);

    const lineItems = cartItems.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: item.productId.title,
        },
        unit_amount: item.productId.price*100,
      },
      quantity: item.quantity,
    }));
    const orderId = order._id.toString();
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `http://localhost:3000/orderSuccess?orderId=${order._id}`, // Pass orderId in URL
      cancel_url: "http://localhost:3000/cancel",
      metadata: { orderId: orderId, userId: userId },
      payment_intent_data: {
        // Add payment_intent_data
        metadata: { orderId: orderId, userId: userId, cartId: cartId }, // Pass orderId to payment intent
      },
    });
    res.json({ id: session.id });
  } catch (error) {
    sendError(res, "Error creating order. Please try again.", 500);
  }
});

// Route to fetch user's orders with product details
router.get("/user-orders", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all orders belonging to the authenticated user
    const orders = await Order.find({ user: userId })
      .populate("items.productId") // Populate product details
      .sort({ createdAt: -1 });    // Sort by most recent orders

    if (orders.length === 0) {
      return sendError(res, "No orders found.", 404);
    }

    // Format the response with order details and individual products
    const formattedOrders = orders.map((order) => ({
      orderId: order._id,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      deliveryDate: order.deliveryDate,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productId: item.productId._id,
        title: item.productId.title,
        quantity: item.quantity,
        price: item.productId.price,
        total: item.productId.price * item.quantity,
      })),
      totalAmount: order.items.reduce(
        (acc, item) => acc + item.productId.price * item.quantity,
        0
      ),
    }));

    sendSuccess(res, "User orders fetched successfully", formattedOrders, 200);
  } catch (error) {
    console.error(error);
    sendError(res, "Error fetching user orders. Please try again.", 500);
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id; // Extract the order ID from the request parameters
    const order = await Order.findById(orderId).populate("items.productId"); // Find order and populate product details

    if (!order) {
      return sendError(res, "Order not found.", 404);
    }

    // Check if the order belongs to the authenticated user (optional, depending on your needs)
    if (order.user.toString() !== req.user.id) {
      return sendError(
        res,
        "You do not have permission to view this order.",
        403
      );
    }

    // Calculate the total amount
    let totalAmount = 0;
    order.items.forEach((item) => {
      if (item.productId) {
        totalAmount += item.productId.price * item.quantity;
      }
      });

    sendSuccess(res, "Order fetched successfully", { order, totalAmount }, 200);
  } catch (error) {
    console.error(error);
    sendError(res, "Error fetching order. Please try again.", 500);
  }
});

router.get("/", authenticateToken, authorizeRole("admin"), async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query; // Get filters and pagination params from query string

    const filters = {}; // Initialize filters

    // Apply status filter
    if (status) {
      filters.status = status;
    }

    // Apply date range filter (startDate and endDate are optional)
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt["$gte"] = new Date(startDate); // Greater than or equal to startDate
      if (endDate) filters.createdAt["$lte"] = new Date(endDate); // Less than or equal to endDate
    }

    // Pagination parameters
    const skip = (page - 1) * limit;
    const limitValue = parseInt(limit);

    // Find orders based on filters and pagination
    const orders = await Order.find(filters)
      .skip(skip) // Skip the previous pages' records
      .limit(limitValue) // Limit the number of results per page
      .populate("items.productId") // Populate product details in order items
      .sort({ createdAt: -1 }); // Optional: Sort by createdAt in descending order

    // Count the total number of orders (for pagination)
    const totalOrders = await Order.countDocuments(filters);

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalOrders / limitValue);

    sendSuccess(
      res,
      "Orders fetched successfully",
      { orders, totalOrders, totalPages, currentPage: page },
      200
    );
  } catch (error) {
    console.error(error);
    sendError(res, "Error fetching orders. Please try again.", 500);
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const { deliveryStatus, deliveryDate } = req.body; // Get the updated delivery status and date

    // Ensure valid delivery status
    const validStatuses = ["pending", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(deliveryStatus)) {
      return sendError(res, "Invalid delivery status.", 400);
    }

    // Validate and parse deliveryDate if provided
    let parsedDeliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    if (deliveryDate && isNaN(parsedDeliveryDate)) {
      return sendError(res, "Invalid delivery date format.", 400);
    }

    // Find and update the order
    const order = await Order.findById(req.params.id);
    if (!order) {
      return sendError(res, "Order not found.", 404);
    }

    // Update the order with new delivery status and date
    order.deliveryStatus = deliveryStatus;
    if (parsedDeliveryDate) {
      order.deliveryDate = parsedDeliveryDate;
    }

    await order.save(); // Save the updated order
    if (deliveryStatus) {
      // Send email based on delivery status change
      const userDetails = await User.findById(order.user).select("-password");
      const subject = `Delivery Status Updated - Order ${order.deliveryStatus}`;
      const text = `Your order (ID: ${
        order._id
      }) status has been updated to: ${deliveryStatus}`;
      await sendEmail(userDetails.email, subject, text);
    }
    sendSuccess(
      res,
      "Order delivery details updated successfully",
      { order },
      200
    );
  } catch (error) {
    console.error(error);
    sendError(res, "Error updating delivery details. Please try again.", 500);
  }
});

export default router;
