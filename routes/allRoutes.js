import userRoutes from './userRoutes.js';
import adminRoutes from './adminRoutes.js';
import productRoutes from './productRoutes.js';
import cartRoutes from './cartRoutes.js';

const setupRoutes = (app) => {
    app.use('/user', userRoutes); // User-specific routes
    app.use('/admin', adminRoutes); // Admin-specific routes
    app.use('/products', productRoutes); // Product routes
    app.use('/carts', cartRoutes);
};

export default setupRoutes;
