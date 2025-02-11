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
    color: Joi.string().allow(""),
    size: Joi.string().allow("")
});

/**
 * @desc Schema for updating cart item quantity
 */
export const updateCartSchema = Joi.object({
    cartItemId: JoiObjectIdExtension().required().messages({
        'any.required': 'cart item ID is required',
        'string.base': 'cart item ID must be a valid ObjectId',
    })
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
