import express from 'express';
import User from '../models/User.js';
import authMiddleware from '../middlewares/authMiddleware.js';
const { authenticateToken } = authMiddleware;
import {userSignupSchema, loginSchema, updateProfileSchema, cartSchema}  from '../validator/userValidator.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { validateRequest } from '../middlewares/validator.js';
import { generateOTP, sendSMS, sendEmail } from '../utils/otpHelper.js';
import bcrypt from 'bcrypt';
import pkg from 'jsonwebtoken';
const { sign } = pkg;

const router = express.Router();

// Sign-up Route
router.post('/signup', validateRequest(userSignupSchema), async (req, res) => {
    const { countryCode, phone, password, firstName, lastName, email, address } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ phone, countryCode });
        if (existingUser) {
            return sendError(res, 'Phone number with this country code is already registered', 400);
        }

        // Hash the password
        const hashedPassword = bcrypt.hashSync(password, 8);

        // Generate OTP and set expiration time
        const otp = generateOTP(); // e.g., a 6-digit OTP
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Create a new user
        const newUser = new User({
            countryCode,
            phone,
            password: hashedPassword,
            otp,
            otpExpiry,
            ...(email && { email }),         
            ...(firstName && { firstName }), 
            ...(lastName && { lastName }),  
            ...(address && { address }),
        });

        await newUser.save();
        // Variables to track SMS and Email status
        let smsStatus = false;
        let emailStatus = false;

        // Send OTP via SMS
        if (phone) {
            try {
                await sendSMS(`${countryCode}${phone}`, `Your OTP is: ${otp}`);
                smsStatus = true; // SMS sent successfully
            } catch (smsError) {
                console.error('Failed to send SMS:', smsError.message);
            }
        }

        // Send OTP via Email
        if (email) {
            try {
                await sendEmail(email, 'OTP Verification', `Your OTP is: ${otp}`);
                emailStatus = true; // Email sent successfully
            } catch (emailError) {
                console.error('Failed to send Email:', emailError.message);
            }
        }

        sendSuccess(res, 'Sign-up successful. Please verify OTP.', { userId: newUser._id }, 201);
    } catch (error) {
        sendError(res, 'Error during sign-up', 500);
    }
});

router.post('/verify-otp', async (req, res) => {
    const { userId, otp } = req.body;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return sendError(res, 'User not found', 404);
        }

        if (!user.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
            return sendError(res, 'OTP expired. Please request a new one.', 400);
        }

        if (user.otp !== otp) {
            return sendError(res, 'Invalid OTP. Please try again.', 400);
        }

        // OTP is valid; clear it and mark the user as verified
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        sendSuccess(res, 'OTP verified successfully. Sign-up complete.', null, 200);
    } catch (error) {
        sendError(res, 'Error during OTP verification', 500);
    }
});

// Forgot Password: Send OTP
router.post('/forgot-password', async (req, res) => {
    const { phone, countryCode, email } = req.body;

    try {
        // Find user by phone and countryCode
        const user = await User.findOne({ phone, countryCode });

        if (!user) {
            return sendError(res, 'User not found', 404);
        }

        // Generate OTP and set expiration
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();
        // Send OTP via SMS
        if (phone) {
            try {
                await sendSMS(`${countryCode}${phone}`, `Your password reset OTP is: ${otp}`);
            } catch (smsError) {
                console.error('Failed to send SMS:', smsError.message);
            }
        }

        // Send OTP via Email
        if (email) {
            try {
                await sendEmail(email, 'Forgot password', `Your password reset OTP is: ${otp}`);
            } catch (emailError) {
                console.error('Failed to send Email:', emailError.message);
            }
        }
        sendSuccess(res, 'OTP sent successfully. Please check your phone or email.', null, 200);
    } catch (error) {
        sendError(res, 'Error during OTP generation', 500);
    }
});

// Reset Password: Validate OTP and Set New Password
router.post('/reset-password', async (req, res) => {
    const { phone, countryCode, otp, newPassword } = req.body;

    try {
        // Find user by phone and countryCode
        const user = await User.findOne({ phone, countryCode });

        if (!user) {
            return sendError(res, 'User not found', 404);
        }

        // Validate OTP
        if (!user.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
            return sendError(res, 'OTP expired. Please request a new one.', 400);
        }

        if (user.otp !== otp) {
            return sendError(res, 'Invalid OTP. Please try again.', 400);
        }

        // Hash the new password
        const hashedPassword = bcrypt.hashSync(newPassword, 8);

        // Update password and clear OTP fields
        user.password = hashedPassword;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        sendSuccess(res, 'Password reset successfully. You can now log in with your new password.', null, 200);
    } catch (error) {
        sendError(res, 'Error during password reset', 500);
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
