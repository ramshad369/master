import express from 'express';
import User from '../models/User.js';
import authMiddleware from '../middlewares/authMiddleware.js';
const { authenticateToken } = authMiddleware;
import {userSignupSchema, loginSchema, updateProfileSchema, cartSchema}  from '../validator/userValidator.js'
import { validateRequest } from '../middlewares/validator.js';
import bcrypt from 'bcrypt';
import pkg from 'jsonwebtoken';
const { sign } = pkg;

const router = express.Router();

// Signup for Users
router.post('/signup', validateRequest(userSignupSchema), async (req, res) => {
    const { phone, password, firstName, lastName, email, address } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ message: 'Phone number already registered' });
        }

        // Hash the password
        const hashedPassword = bcrypt.hashSync(password, 8);

        // Create a new user
        const newUser = new User({
            phone,
            password: hashedPassword,
            ...(email && { email }),         
            ...(firstName && { firstName }), 
            ...(lastName && { lastName }),  
            ...(address && { address }),
        });

        await newUser.save();

        res.status(201).json({ message: 'Sign-up successful', userId: newUser._id });
    } catch (error) {
        next(error); 
        }
});

// Login
router.post('/login', validateRequest(loginSchema),async (req, res) => {
    const { phone, password } = req.body;

    try {
        const user = await User.findOne({ phone });
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        res.json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ message: 'Error during login', error: error.message });
        next(error);     } 
});

// Get User Profile
router.get('/profile/:id', authenticateToken,async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        next(error); 
    }
});


// Add to Cart
router.post('/cart', authenticateToken, validateRequest(cartSchema),async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const existingItem = user.cart.find(item => item.productId.toString() === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            user.cart.push({ productId, quantity });
        }

        await user.save();
        res.status(200).json({ message: 'Cart updated successfully', cart: user.cart });
    } catch (error) {
        res.status(500).json({ message: 'Error updating cart', error: error.message });
    }
});

// Get Cart
router.get('/cart', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('cart.productId');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json(user.cart);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cart', error: error.message });
    }
});

// Update Profile
router.put('/profile', authenticateToken, validateRequest(updateProfileSchema), async (req, res) => {
    const { address, email, firstName,lastName, userId } = req.body;
    let update = {};
    if(address){
        update.address = address;
    }
    if(email){
        update.email = email;
    }
    if(firstName){
        update.firstName = firstName;
    }
    if(lastName){
        update.lastName = lastName;
    }
    try {
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            update,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User details updated successfully'});
    } catch (error) {
        next(error); 
    }
});

export default router;
