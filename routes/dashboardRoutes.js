import express from "express";
const router = express.Router();
import Order from "../models/order.js";
import User from "../models/User.js";
import authMiddleware from "../middlewares/authMiddleware.js";
const { authenticateToken, authorizeRole } = authMiddleware;
import { sendSuccess, sendError } from "../utils/responseHandler.js";

// Dashboard Summary API
router.get("/summary", async (req, res) => {
    try {
      const totalSales = await Order.aggregate([
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.price" } } }
      ]);
      const lastMonthSales = await Order.aggregate([
        { $match: { createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) } } },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.price" } } }
      ]);
  
      const totalOrders = await Order.countDocuments();
      const lastMonthOrders = await Order.countDocuments({
        createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) }
      });
  
      const revenue = totalSales[0]?.total || 0;
      const lastMonthRevenue = lastMonthSales[0]?.total || 0;
      const revenueIncrease = lastMonthRevenue ? ((revenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
      const orderIncrease = lastMonthOrders ? ((totalOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0;
      
      const activeCustomers = await User.countDocuments();
      const lastMonthCustomers = await User.countDocuments({
        createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) }
      });
      const customerIncrease = lastMonthCustomers ? ((activeCustomers - lastMonthCustomers) / lastMonthCustomers) * 100 : 0;
      
      sendSuccess(res, "Dashboard summary fetched successfully", {
        totalSales: revenue,
        totalOrders,
        revenue,
        revenueIncrease: revenueIncrease.toFixed(2),
        totalOrdersIncrease: orderIncrease.toFixed(2),
        activeCustomers,
        activeCustomersIncrease: customerIncrease.toFixed(2)
      }, 200);
    } catch (error) {
      console.error(error);
      sendError(res, "Error fetching dashboard summary. Please try again.", 500);
    }
  });
  

// Get sales analysis
router.get("/sales-analysis", authenticateToken, authorizeRole("admin"), async (req, res) => {
  try {
    const salesData = await Order.aggregate([
        { $unwind: "$items" },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          totalSales: { $sum: "$items.price" },
        },
      },
    ]);

    sendSuccess(res, "Sales analysis data fetched", salesData, 200);
  } catch (error) {
    sendError(res, "Error fetching sales analysis", 500);
  }
});

// Get top selling products
router.get("/top-products", authenticateToken, authorizeRole("admin"), async (req, res) => {
  try {
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.price" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
    ]);

    sendSuccess(res, "Top selling products fetched", topProducts, 200);
  } catch (error) {
    sendError(res, "Error fetching top selling products", 500);
  }
});

export default router;
