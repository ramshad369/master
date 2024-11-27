import userRoutes from './userRoutes.js';
import adminRoutes from './adminRoutes.js';
import productRoutes from './productRoutes.js';

const setupRoutes = (app) => {
    app.use('/user', userRoutes); // User-specific routes
    app.use('/admin', adminRoutes); // Admin-specific routes
    app.use('/products', productRoutes); // Product routes
};

export default setupRoutes;
