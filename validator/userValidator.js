import Joi from 'joi';
import JoiObjectId from 'joi-objectid';

// Initialize the JoiObjectId extension properly by passing Joi as an argument
const JoiObjectIdExtension = JoiObjectId(Joi);
// Validation schema for sign-up
export const userSignupSchema = Joi.object({
    phone: Joi.string().pattern(/^[+\d]?[0-9-]*$/).required().messages({
        'string.pattern.base': 'Phone number must contain only valid characters (digits, dashes, or a leading "+")',
    }),    
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
    }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Confirm password is required',
    }),
    firstName: Joi.string().min(2).max(30).required(),
    lastName: Joi.string().min(2).max(30).optional(),
    email: Joi.string().email().optional(),
    address: Joi.string().min(5).optional(),
});

// Login Schema
export const loginSchema = Joi.object({
    phone: Joi.string().pattern(/^[+\d]?[0-9-]*$/).required().messages({
        'string.pattern.base': 'Phone number must contain only valid characters (digits, dashes, or a leading "+")',
    }),    
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required',
    }),
});

// Cart Schema
export const cartSchema = Joi.object({
    productId: Joi.string().required().messages({
        'any.required': 'Product ID is required',
    }),
    quantity: Joi.number().integer().min(1).required().messages({
        'number.base': 'Quantity must be a number',
        'number.min': 'Quantity must be at least 1',
        'any.required': 'Quantity is required',
    }),
});

// Update Profile Schema
export const updateProfileSchema = Joi.object({
     userId: JoiObjectIdExtension().optional().messages({
        'string.base': 'User ID must be a valid ObjectId',
    }),
    address: Joi.string().min(5).optional().messages({
        'string.min': 'Address must be at least 5 characters long',
    }),
    email: Joi.string().email().optional().messages({
        'string.email': 'Invalid email format',
    }),
    firstName: Joi.string().min(2).max(30).optional().messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 30 characters',
    }),
    lastName: Joi.string().min(2).max(30).optional().messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 30 characters',
    }),
});