// middlewares/errorHandler.js
export const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // Log the error (useful for debugging)
    // Customize the response based on the error type
    const status = err.status || 500;
    const message = err.message || 'An unexpected error occurred';

    res.status(status).json({ status, message });
};
