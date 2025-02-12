// routes/orderRoutes.js
import express from 'express';
import Order from '../models/order.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validator.js';
import { createOrderSchema, updateOrderSchema } from '../validator/orderValidator.js';

const router = express.Router();
const { authenticateToken } = authMiddleware;

// Create Order
router.post('/', authenticateToken, validateRequest(createOrderSchema), async (req, res) => {
    try {
        const order = new Order({ ...req.body, userId: req.user.id });
        await order.save();
        sendSuccess(res, 'Order placed successfully', { order }, 201);
    } catch (error) {
        console.error(error);
        sendError(res, 'Error placing order.', 500);
    }
});

// Update Order Status
router.put('/:orderId', authenticateToken, validateRequest(updateOrderSchema), async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.orderId, req.body, { new: true });
        if (!order) return sendError(res, 'Order not found.', 404);
        sendSuccess(res, 'Order updated successfully', { order }, 200);
    } catch (error) {
        console.error(error);
        sendError(res, 'Error updating order.', 500);
    }
});

// Get User Orders
router.get('/', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id }).populate('items.productId');
        sendSuccess(res, 'Orders fetched successfully', { orders }, 200);
    } catch (error) {
        console.error(error);
        sendError(res, 'Error fetching orders.', 500);
    }
});

export default router;

