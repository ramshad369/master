export const sendSuccess = (res, message, data = null, statusCode = 200) => {
    res.status(statusCode).json({
        status: statusCode,
        message,
        data,
    });
};

export const sendError = (res, message, statusCode = 400) => {
    res.status(statusCode).json({
        status: statusCode,
        message,
        data: null,
    });
};
