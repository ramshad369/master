import express from "express";
const router = express.Router();
import Order from "../models/Order.js";
import User from "../models/User.js";
import authMiddleware from "../middlewares/authMiddleware.js";
const { authenticateToken, authorizeRole } = authMiddleware;
import { sendSuccess, sendError } from "../utils/responseHandler.js";

// Dashboard Summary API
router.get("/summary", async (req, res) => {
    try {

      const startOfCurrentMonth = new Date();
      startOfCurrentMonth.setDate(1);
      startOfCurrentMonth.setHours(0, 0, 0, 0);

      const startOfLastMonth = new Date();
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
      startOfLastMonth.setDate(1);
      startOfLastMonth.setHours(0, 0, 0, 0);

      const endOfLastMonth = new Date(startOfCurrentMonth.getTime() - 1);

      const totalSales = await Order.aggregate([
          { $unwind: "$items" },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } }
      ]);
      const totalOrders = await Order.countDocuments();
      const activeCustomers = await User.countDocuments();
      // Current month sales
      const currentMonthSales = await Order.aggregate([
        { $match: { createdAt: { $gte: startOfCurrentMonth } } },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } }
      ]);

      // Last month sales
      const lastMonthSales = await Order.aggregate([
        { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } }
      ]);

      const currentMonthOrders = await Order.countDocuments({
        createdAt: { $gte: startOfCurrentMonth }
      });

      const lastMonthOrders = await Order.countDocuments({
        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
      });

      const currentMonthCustomers = await User.countDocuments({
        createdAt: { $gte: startOfCurrentMonth }
      });

      const lastMonthCustomers = await User.countDocuments({
        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
      });


      const currentRevenue = currentMonthSales[0]?.total || 0;
      const lastRevenue = lastMonthSales[0]?.total || 0;
      
      const revenueIncrease = calculatePercentageIncrease(currentRevenue, lastRevenue);
      const orderIncrease = calculatePercentageIncrease(currentMonthOrders, lastMonthOrders);
      const customerIncrease = calculatePercentageIncrease(currentMonthCustomers, lastMonthCustomers);
    
      
      sendSuccess(res, "Dashboard summary fetched successfully", {
        totalSales:totalSales[0]?.total||0,
        totalOrders,
        revenue: totalSales[0]?.total||0,
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
          totalSales: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
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
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
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

function calculatePercentageIncrease(current, last) {
  if (last === 0 && current === 0) return 0;
  if (last === 0 && current > 0) return 100;
  if (last === 0) return 0;

  const change = ((current - last) / last) * 100;
  
  // Optional: do not show negative % below 0
  if (change < 0) return 0;

  return change;
}


export default router;
