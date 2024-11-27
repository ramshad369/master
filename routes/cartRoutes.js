import { Router } from 'express';
import Cart, { findOne } from '../models/Cart';
import { findById } from '../models/Product';
const router = Router();

// Get the user's cart
router.get('/', async (req, res) => {
    try {
        const cart = await findOne({ userId: req.user.id }).populate('items.productId');
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cart', error: error.message });
    }
});

// Add a product to the cart
router.post('/add', async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        const product = await findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const cart = await findOne({ userId: req.user.id });
        if (cart) {
            const existingItem = cart.items.find(item => item.productId.toString() === productId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.items.push({ productId, quantity });
            }
            await cart.save();
        } else {
            const newCart = new Cart({
                userId: req.user.id,
                items: [{ productId, quantity }],
            });
            await newCart.save();
        }

        res.status(201).json({ message: 'Product added to cart' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding product to cart', error: error.message });
    }
});

// Remove product from cart
router.delete('/remove/:productId', async (req, res) => {
    const { productId } = req.params;

    try {
        const cart = await findOne({ userId: req.user.id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        cart.items = cart.items.filter(item => item.productId.toString() !== productId);
        await cart.save();

        res.status(200).json({ message: 'Product removed from cart' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing product from cart', error: error.message });
    }
});

export default router;
