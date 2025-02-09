import Joi from 'joi';
import JoiObjectId from 'joi-objectid';

// Initialize the JoiObjectId extension properly
const JoiObjectIdExtension = JoiObjectId(Joi);

/**
 * @desc Schema for adding items to the cart
 */
export const addToCartSchema = Joi.object({
    productId: JoiObjectIdExtension().required().messages({
        'any.required': 'Product ID is required',
        'string.base': 'Product ID must be a valid ObjectId',
    }),
    color: Joi.string().optional(),
    size: Joi.string().optional(),
});

/**
 * @desc Schema for updating cart item quantity
 */
export const updateCartSchema = Joi.object({
    cartItemId: JoiObjectIdExtension().required().messages({
        'any.required': 'cart item ID is required',
        'string.base': 'cart item ID must be a valid ObjectId',
    }),
    color: Joi.string().optional().messages({
        'string.base': 'Color must be a string',
    }),
    quantity: Joi.string().optional().messages({
        'string.base': 'quantity must be a string',
    }),
    size: Joi.string().optional().messages({
        'string.base': 'Size must be a string',
    }),
});

/**
 * @desc Schema for removing an item from the cart
 */
export const removeFromCartSchema = Joi.object({
    productId: JoiObjectIdExtension().required().messages({
        'any.required': 'Product ID is required',
        'string.base': 'Product ID must be a valid ObjectId',
    }),
});

/**
 * @desc Schema for clearing the entire cart
 */
export const clearCartSchema = Joi.object({});
