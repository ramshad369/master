import pkg from 'jsonwebtoken';
const { verify } = pkg;
import { sendError } from '../utils/responseHandler.js';

const JWT_SECRET = process.env.JWT_SECRET; // Replace with environment variable in production.

// Middleware to authenticate token
 const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return sendError(res, 'Unauthorized', 401);
    }

    verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return sendError(res, 'Forbidden', 403);
        }
        req.user = user;
        next();
    });
};

// Middleware to check roles
 const authorizeRole = (role) => (req, res, next) => {
    if (req.user.role !== role) {
        return sendError(res, 'Access Denied', 403);
    }
    next();
};
export default { authenticateToken, authorizeRole };