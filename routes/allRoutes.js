import userRoutes from './userRoutes.js';
import adminRoutes from './adminRoutes.js';
import productRoutes from './productRoutes.js';
import cartRoutes from './cartRoutes.js';
import orderRoutes from './orderRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import wishlistRoutes from './wishlistRoutes.js';

const setupRoutes = (app) => {
    app.use('/user', userRoutes); 
    app.use('/admin', adminRoutes); 
    app.use('/products', productRoutes);
    app.use('/carts', cartRoutes);
    app.use('/orders', orderRoutes);
    app.use('/dashboard', dashboardRoutes);
    app.use('/wishlist', wishlistRoutes);
};

export default setupRoutes;
