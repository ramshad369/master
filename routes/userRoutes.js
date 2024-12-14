import express from 'express';
import User from '../models/User.js';
import authMiddleware from '../middlewares/authMiddleware.js';
const { authenticateToken } = authMiddleware;
import { userSignupSchema, loginSchema, updateProfileSchema, cartSchema } from '../validator/userValidator.js';
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
            return sendError(res, 'Phone number with this country code is already registered.', 400);
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
        console.error('Error during signup:', error);
        sendError(res, 'An error occurred during signup. Please try again later.', 500);
    }
});

// Verify OTP Route
router.post('/verify-otp', async (req, res) => {
    const { userId, otp } = req.body;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return sendError(res, 'User not found.', 404);
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
        console.error('Error verifying OTP:', error);
        sendError(res, 'An error occurred while verifying OTP. Please try again later.', 500);
    }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
    const { phone, countryCode, email } = req.body;

    try {
        const user = await User.findOne({ phone, countryCode });

        if (!user) {
            return sendError(res, 'User not found. Please check the phone number and country code.', 404);
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
                sendError(res, 'Failed to send OTP via SMS. Please try again later.', 500);
                return;
            }
        }

        // Send OTP via Email
        if (email) {
            try {
                await sendEmail(email, 'Forgot Password', `Your password reset OTP is: ${otp}`);
            } catch (emailError) {
                console.error('Failed to send Email:', emailError.message);
                sendError(res, 'Failed to send OTP via Email. Please try again later.', 500);
                return;
            }
        }

        sendSuccess(res, 'OTP sent successfully. Please check your phone or email for the OTP.', null, 200);
    } catch (error) {
        console.error('Error during password reset request:', error);
        sendError(res, 'An error occurred while sending OTP. Please try again later.', 500);
    }
});

// Reset Password Route
router.post('/reset-password', async (req, res) => {
    const { phone, countryCode, otp, newPassword } = req.body;

    try {
        const user = await User.findOne({ phone, countryCode });

        if (!user) {
            return sendError(res, 'User not found. Please check the phone number and country code.', 404);
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
        console.error('Error during password reset:', error);
        sendError(res, 'An error occurred while resetting your password. Please try again later.', 500);
    }
});

// Login Route
router.post('/login', validateRequest(loginSchema), async (req, res) => {
    const { phone, password } = req.body;

    try {
        const user = await User.findOne({ phone });

        if (!user) {
            return sendError(res, 'Invalid credentials. No user found with this phone number.', 401);
        }

        if (!bcrypt.compareSync(password, user.password)) {
            return sendError(res, 'Invalid credentials. Incorrect password.', 401);
        }

        const token = sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        sendSuccess(res, 'Login successful', { token , role: user.role });
    } catch (error) {
        console.error('Error during login:', error);
        sendError(res, 'An error occurred during login. Please try again later.', 500);
    }
});

// User Profile Route
router.get('/profile/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password'); // Exclude password
        if (!user) {
            return sendError(res, 'User not found.', 404);
        }

        sendSuccess(res, 'User profile fetched successfully', user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        sendError(res, 'An error occurred while fetching user profile. Please try again later.', 500);
    }
});

// Update Profile Route
router.put('/profile', authenticateToken, validateRequest(updateProfileSchema), async (req, res) => {
    const { address, email, firstName, lastName, userId } = req.body;
    let update = {};
    if (address) update.address = address;
    if (email) update.email = email;
    if (firstName) update.firstName = firstName;
    if (lastName) update.lastName = lastName;

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true }).select('-password');
        if (!updatedUser) {
            return sendError(res, 'User not found.', 404);
        }

        sendSuccess(res, 'User details updated successfully', updatedUser);
    } catch (error) {
        console.error('Error updating profile:', error);
        sendError(res, 'An error occurred while updating profile. Please try again later.', 500);
    }
});

// Resend OTP Route
router.post('/resend-otp', async (req, res) => {
    const { userId } = req.body;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return sendError(res, 'User not found.', 404);
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        let smsStatus = false;
        let emailStatus = false;

        // Send OTP via SMS
        if (user.phone) {
            try {
                await sendSMS(`${user.countryCode}${user.phone}`, `Your OTP is: ${otp}`);
                smsStatus = true;
            } catch (smsError) {
                console.error('Failed to send SMS:', smsError.message);
            }
        }

        // Send OTP via Email
        if (user.email) {
            try {
                await sendEmail(user.email, 'Resend OTP', `Your OTP is: ${otp}`);
                emailStatus = true;
            } catch (emailError) {
                console.error('Failed to send Email:', emailError.message);
            }
        }

        if (!smsStatus && !emailStatus) {
            return sendError(res, 'Failed to resend OTP via SMS or Email. Please try again later.', 500);
        }

        sendSuccess(res, 'OTP resent successfully. Please check your phone or email.', { otpExpiry: user.otpExpiry }, 200);
    } catch (error) {
        console.error('Error during OTP resend:', error);
        sendError(res, 'An error occurred while resending OTP. Please try again later.', 500);
    }
});

export default router;
