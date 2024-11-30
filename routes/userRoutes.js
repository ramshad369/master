import express from 'express';
import User from '../models/User.js';
import authMiddleware from '../middlewares/authMiddleware.js';
const { authenticateToken } = authMiddleware;
import {userSignupSchema, loginSchema, updateProfileSchema, cartSchema}  from '../validator/userValidator.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js';
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
        sendSuccess(res,'Sign-up successful',{ userId: newUser._id }, 201)
    } catch (error) {
        sendError(res, 'Error during sign-up', 500);
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

        sendSuccess(res, 'Login successful', { token });
    } catch (error) {
        sendError(res, 'Error during login', 500);
    } 
});

// Get User Profile
router.get('/profile/:id', authenticateToken,async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        sendSuccess(res, 'User profile fetched successfully', user);
    } catch (error) {
        sendError(res, 'Error fetching profile', 500);
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
        sendSuccess(res, 'Cart updated successfully', user.cart);
    } catch (error) {
        sendError(res, 'Error updating cart', 500);
    }
});

// Get Cart
router.get('/cart', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('cart.productId');
        if (!user)  return sendError(res, 'User not found', 404);

        sendSuccess(res, 'Cart fetched successfully', user.cart);
    } catch (error) {
        sendError(res, 'Error fetching cart', 500);
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

        sendSuccess(res, 'User details updated successfully', updatedUser);
    } catch (error) {
        sendError(res, 'Error updating user details', 500);
    }
});

export default router;
