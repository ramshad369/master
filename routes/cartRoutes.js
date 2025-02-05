import { Router } from 'express';
import Cart from '../models/Cart';
import Product from '../models/Product';

const router = Router();

// Get the user's cart with populated product details and total amount
router.get('/', async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.status(404).json({ message: 'Cart is empty' });
        }

        // Calculate total amount
        let totalAmount = 0;
        cart.items.forEach(item => {
            if (item.productId) {
                totalAmount += item.productId.price * item.quantity;
            }
        });

        res.status(200).json({ cart, totalAmount });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cart', error: error.message });
    }
});

// Add a product to the cart with color and size
router.post('/add', async (req, res) => {
    const { productId, quantity, color, size } = req.body;

    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        let cart = await Cart.findOne({ userId: req.user.id });

        if (cart) {
            const existingItem = cart.items.find(
                item =>
                    item.productId.toString() === productId &&
                    item.color === color &&
                    item.size === size
            );

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.items.push({ productId, quantity, color, size });
            }
        } else {
            cart = new Cart({
                userId: req.user.id,
                items: [{ productId, quantity, color, size }],
            });
        }

        await cart.save();
        res.status(201).json({ message: 'Product added to cart', cart });
    } catch (error) {
        res.status(500).json({ message: 'Error adding product to cart', error: error.message });
    }
});

// Remove a product from the cart
router.delete('/remove/:productId', async (req, res) => {
    const { productId } = req.params;

    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        cart.items = cart.items.filter(item => item.productId.toString() !== productId);
        await cart.save();

        res.status(200).json({ message: 'Product removed from cart', cart });
    } catch (error) {
        res.status(500).json({ message: 'Error removing product from cart', error: error.message });
    }
});

export default router;
