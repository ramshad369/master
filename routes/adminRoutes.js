import { Router } from 'express';
// Import and destructure
import authMiddleware from '../middlewares/authMiddleware.js';
const { authenticateToken,authorizeRole } = authMiddleware;

import User from '../models/User.js';

const router = Router();

// Pre-create the super admin
// (async () => {
//     const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
//     if (!existingSuperAdmin) {
//         const hashedPassword = hashSync('superadmin123', 8);
//         const superAdmin = new User({ username: 'superadmin', password: hashedPassword, role: 'superadmin' });
//         await superAdmin.save();
//         console.log('Super admin created successfully');
//     }
// })();

// Get All Users (Admin or Super Admin)
router.get('/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }); // Fetch only regular users
        res.json({ message: 'List of users', users });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

// Add New Admin (Super Admin Only)
router.post('/add-admin', authenticateToken, authorizeRole('superadmin'), async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingAdmin = await User.findOne({ username });
        if (existingAdmin) return res.status(400).json({ message: 'Admin already exists' });

        const hashedPassword = bcrypt.hashSync(password, 8);
        const newAdmin = new User({ username, password: hashedPassword, role: 'admin' });
        await newAdmin.save();

        res.json({ message: 'Admin added successfully', admin: { id: newAdmin._id, username: newAdmin.username } });
    } catch (error) {
        res.status(500).json({ message: 'Error adding admin', error: error.message });
    }
});

export default router;
