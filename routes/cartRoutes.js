import express from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validator.js';
import { addToCartSchema, updateCartSchema } from '../validator/cartValidator.js';

const router = express.Router();
const { authenticateToken } = authMiddleware;

/**
 * @route POST /cart/add
 * @desc Add product to the cart
 * @access Private (Authenticated Users)
 */
router.post('/', authenticateToken, validateRequest(addToCartSchema), async (req, res) => {
    const { productId, color, size  } = req.body;

    try {
        const product = await Product.findById(productId);
        if (!product) return sendError(res, 'Product not found.', 400);

        let cart = await Cart.findOne({ userId: req.user.id });

        if (!cart) {
            cart = new Cart({
                userId: req.user.id,
                items: [{ productId,quantity: 1, color, size  }],
            });
        } else {
            const existingItem = cart.items.find(item => item.productId.toString() === productId);
            
            if (!existingItem) {
                cart.items.push({ productId, quantity: 1, color, size  });
            }
        }

        await cart.save();
        sendSuccess(res, 'Product added to cart', { cart }, 201);
    } catch (error) {
        console.error(error);
        sendError(res, 'Error adding product to cart.', 500);
    }
});

/**
 * @route PUT /cart/update/:cartItemId
 * @desc Update cart item (color, size)
 * @access Private (Authenticated Users)
 */
router.put('/:cartItemId', authenticateToken, validateRequest(updateCartSchema), async (req, res) => {
    const { cartItemId } = req.params;
    const { color, size } = req.body;

    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) return sendError(res, 'Cart not found.', 404);

        const item = cart.items.find(item => item._id.toString() === cartItemId);
        if (!item) return sendError(res, 'Cart item not found.', 404);

        if (color !== undefined) item.color = color;
        if (size !== undefined) item.size = size;
        if (quantity !== undefined) item.quantity = quantity;

        await cart.save();
        sendSuccess(res, 'Cart updated successfully', { cart }, 200);
    } catch (error) {
        console.error(error);
        sendError(res, 'Error updating cart.', 500);
    }
});


/**
 * @route DELETE /cart/remove/:productId
 * @desc Remove a product from the cart
 * @access Private (Authenticated Users)
 */
router.delete('/remove/:productId', authenticateToken, async (req, res) => {
    const { productId } = req.params;

    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) return sendError(res, 'Cart not found.', 404);

        cart.items = cart.items.filter(item => item.productId.toString() !== productId);
        await cart.save();

        sendSuccess(res, 'Product removed from cart', { cart }, 200);
    } catch (error) {
        console.error(error);
        sendError(res, 'Error removing product from cart.', 500);
    }
});

/**
 * @route DELETE /cart/clear
 * @desc Clear the entire cart
 * @access Private (Authenticated Users)
 */
router.delete('/clear', authenticateToken, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) return sendError(res, 'Cart already empty.', 404);

        cart.items = [];
        await cart.save();

        sendSuccess(res, 'Cart cleared successfully', {}, 200);
    } catch (error) {
        console.error(error);
        sendError(res, 'Error clearing cart.', 500);
    }
});

/**
 * @route GET /cart
 * @desc Get user's cart with populated product details & total amount
 * @access Private (Authenticated Users)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return sendError(res, 'Your cart is empty.', 404);
        }

        // Calculate total amount
        let totalAmount = 0;
        cart.items.forEach(item => {
            if (item.productId) {
                totalAmount += item.productId.price * item.quantity;
            }
        });

        sendSuccess(res, 'Cart fetched successfully', { cart, totalAmount }, 200);
    } catch (error) {
        console.error(error);
        sendError(res, 'Error fetching cart. Please try again.', 500);
    }
});
export default router;
