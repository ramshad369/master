import express from 'express';
import User from '../models/User.js';
import Product from '../models/Product.js';
import authMiddleware from "../middlewares/authMiddleware.js";
const { authenticateToken } = authMiddleware;
import { sendSuccess, sendError } from "../utils/responseHandler.js";

const router = express.Router();

// Add product to wishlist
router.post("/add", authenticateToken, async (req, res) => {
    try {
        const { productId } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return sendError(res, "User not found", 404);

        // Check if the product exists
        const product = await Product.findById(productId);
        if (!product) return sendError(res, "Product not found", 404);

        // Check if the product is already in wishlist
        if (user.wishlist.includes(productId)) {
            return sendError(res, "Product already in wishlist", 400);
        }

        user.wishlist.push(productId);
        await user.save();

        sendSuccess(res, "Product added to wishlist", user.wishlist, 200);
    } catch (error) {
        console.error(error);
        sendError(res, "Error adding product to wishlist", 500);
    }
});

// Remove product from wishlist
router.delete("/remove/:productId", authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;
        const user = await User.findById(req.user.id);

        if (!user) return sendError(res, "User not found", 404);

        user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
        await user.save();

        sendSuccess(res, "Product removed from wishlist", user.wishlist, 200);
    } catch (error) {
        console.error(error);
        sendError(res, "Error removing product from wishlist", 500);
    }
});

// Get user's wishlist
router.get("/", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("wishlist");

        if (!user) return sendError(res, "User not found", 404);

        sendSuccess(res, "Wishlist fetched successfully", user.wishlist, 200);
    } catch (error) {
        console.error(error);
        sendError(res, "Error fetching wishlist", 500);
    }
});

export default router;
