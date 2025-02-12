// validator/orderValidator.js
import Joi from 'joi';

export const createOrderSchema = Joi.object({
    items: Joi.array().items(
        Joi.object({
            productId: Joi.string().required(),
            quantity: Joi.number().min(1).required(),
            color: Joi.string().optional(),
            size: Joi.string().optional(),
        })
    ).required(),
    address: Joi.string().min(5).required(),
    paymentMethod: Joi.string().valid('cod', 'card', 'paypal').required(),
});

export const updateOrderSchema = Joi.object({
    status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled').required(),
});