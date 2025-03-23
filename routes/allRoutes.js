import userRoutes from './userRoutes.js';
import adminRoutes from './adminRoutes.js';
import productRoutes from './productRoutes.js';
import cartRoutes from './cartRoutes.js';
import orderRoutes from './orderRoutes.js';

const setupRoutes = (app) => {
    app.use('/user', userRoutes); 
    app.use('/admin', adminRoutes); 
    app.use('/products', productRoutes);
    app.use('/carts', cartRoutes);
    app.use('/orders', orderRoutes);
};

export default setupRoutes;
