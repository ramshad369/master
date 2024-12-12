import Joi from 'joi';

// Validation schema for creating a product
export const createProductSchema = Joi.object({
    title: Joi.string().min(3).max(100).required().messages({
        'string.base': 'Title must be a string',
        'string.min': 'Title must be at least 3 characters long',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required',
    }),
    category: Joi.string().min(2).max(50).required().messages({
        'string.base': 'Category must be a string',
        'string.min': 'Category must be at least 2 characters long',
        'string.max': 'Category cannot exceed 50 characters',
        'any.required': 'Category is required',
    }),
    price: Joi.number().min(0).required().messages({
        'number.base': 'Price must be a number',
        'number.min': 'Price must be at least 0',
        'any.required': 'Price is required',
    }),
    originalPrice: Joi.number().min(0).optional().messages({
        'number.base': 'Original Price must be a number',
        'number.min': 'Original Price must be at least 0',
    }),
    discount: Joi.number().min(0).max(100).optional().messages({
        'number.base': 'Discount must be a number',
        'number.min': 'Discount must be at least 0',
        'number.max': 'Discount cannot be more than 100',
    }),
    rating: Joi.number().min(0).max(5).optional().messages({
        'number.base': 'Rating must be a number',
        'number.min': 'Rating must be at least 0',
        'number.max': 'Rating cannot exceed 5',
    }),
    image: Joi.string().uri().optional().messages({
        'string.uri': 'Image URL must be a valid URI',
    }),
});

// Validation schema for updating a product
export const updateProductSchema = Joi.object({
    title: Joi.string().min(3).max(100).optional().messages({
        'string.base': 'Title must be a string',
        'string.min': 'Title must be at least 3 characters long',
        'string.max': 'Title cannot exceed 100 characters',
    }),
    category: Joi.string().min(2).max(50).optional().messages({
        'string.base': 'Category must be a string',
        'string.min': 'Category must be at least 2 characters long',
        'string.max': 'Category cannot exceed 50 characters',
    }),
    price: Joi.number().min(0).optional().messages({
        'number.base': 'Price must be a number',
        'number.min': 'Price must be at least 0',
    }),
    originalPrice: Joi.number().min(0).optional().messages({
        'number.base': 'Original Price must be a number',
        'number.min': 'Original Price must be at least 0',
    }),
    discount: Joi.number().min(0).max(100).optional().messages({
        'number.base': 'Discount must be a number',
        'number.min': 'Discount must be at least 0',
        'number.max': 'Discount cannot be more than 100',
    }),
    rating: Joi.number().min(0).max(5).optional().messages({
        'number.base': 'Rating must be a number',
        'number.min': 'Rating must be at least 0',
        'number.max': 'Rating cannot exceed 5',
    }),
    image: Joi.string().uri().optional().messages({
        'string.uri': 'Image URL must be a valid URI',
    }),
});

export const deleteProductSchema = Joi.object({
    id: Joi.string().hex().length(24).required().messages({
        'any.required': 'Product ID is required',
        'string.hex': 'Product ID must be a valid hexadecimal string',
        'string.length': 'Product ID must be 24 characters long',
    }),
});

