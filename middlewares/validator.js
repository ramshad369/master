import { sendError } from '../utils/responseHandler.js';

// Middleware for validating request body
export const validateRequest = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        return sendError(res, { message: error.details[0].message }, 403);
    }
    next();
};
