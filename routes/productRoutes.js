import { Router } from 'express';
import Product from '../models/Product.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import authMiddleware from '../middlewares/authMiddleware.js';
const { authenticateToken, authorizeRole } = authMiddleware;
import { validateRequest } from '../middlewares/validator.js'; // Assuming a middleware that validates based on Joi schemas
import { createProductSchema, updateProductSchema, deleteProductSchema } from '../validator/productValidator.js'; // Assuming you have these schemas

const router = Router();

import multer from 'multer';
import path from 'path';

// Configure multer storage options
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Specify the folder where the files will be saved
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Using current timestamp for unique filename
    }
});

// Filter for allowed image file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and GIF files are allowed'), false);
    }
};

// Initialize multer with storage options and file filter
const upload = multer({ storage, fileFilter });


// Create a new product route (Admin only)
router.post('/', 
  authenticateToken, 
  authorizeRole('admin'), 
  upload.single('image'), // This is where the image is uploaded
  validateRequest(createProductSchema), // Validating the request body for product creation
  async (req, res) => {
    const { title, category, price, originalPrice, discount, rating, stocks } = req.body;
    let imageUrl = req.file ? `/uploads/${req.file.filename}` : null; // Store the image URL or path

    try {
        const newProduct = new Product({
            title, 
            category, 
            price, 
            originalPrice, 
            discount, 
            rating, 
            image: imageUrl,
            stocks 
        });

        await newProduct.save();
        sendSuccess(res, 'Product created successfully', { product: newProduct }, 201);
    } catch (error) {
        sendError(res, error.message, 500, error.message);
    }
});

// Update a product route (Admin only)
router.put('/:id',
    authenticateToken, 
    authorizeRole('admin'), 
    upload.single('image'), // Handle image upload (if provided)
    validateRequest(updateProductSchema), // Validating the request body for product update
    async (req, res) => {
      const { id } = req.params;
      const { title, category, price, originalPrice, discount, rating, stocks } = req.body;
      
      // Handle the uploaded image if any
      let imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined; // If a new image is uploaded, save the new image URL
  
      try {
          // Retrieve the existing product from the database
          const existingProduct = await Product.findById(id);
  
          if (!existingProduct) {
              return sendError(res, 'Product not found', 404);
          }
  
          // If no new image is uploaded, keep the existing image URL
          if (!imageUrl) {
              imageUrl = existingProduct.image;
          }
  
          // Update the product with the new details (and image if provided)
          const updatedProduct = await Product.findByIdAndUpdate(
              id, 
              {
                  title, 
                  category, 
                  price, 
                  originalPrice, 
                  discount, 
                  rating, 
                  image: imageUrl,
                  stocks: stocks !== undefined ? stocks : existingProduct.stocks
              }, 
              { new: true } // Return the updated product
          );
  
          sendSuccess(res, 'Product updated successfully', { product: updatedProduct }, 200);
      } catch (error) {
          sendError(res, error.message, 500, error.message);
      }
  });

  router.delete('/:id', 
    authenticateToken, 
    authorizeRole('admin'), 
    async (req, res) => {
        const { id } = req.params; // Extract productId from params

        try {
            // Delete the product from the database
            const deletedProduct = await Product.findByIdAndDelete(id);
            
            if (!deletedProduct) {
                return sendError(res, 'Product not found', 404);
            }

            // Send success response
            sendSuccess(res, 'Product deleted successfully', deletedProduct, 200);
        } catch (error) {
            sendError(res, error.message, 500, error.message);
        }
    }
);

router.get('/', async (req, res) => {
    try {
        // Destructure query parameters from the request
        const { search, category, minPrice, maxPrice, sort } = req.query;

        // Build the query object
        let query = {};

        // If a search term is provided, search in both title and category (case-insensitive)
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        // If category filter is provided, filter by category
        if (category) {
            query.category = { $regex: category, $options: 'i' };
        }

        // If price range is provided, filter by price range
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = minPrice;
            if (maxPrice) query.price.$lte = maxPrice;
        }

        // Sorting logic
        let sortCriteria = {};

        // If sort parameter is provided, sort based on the value
        if (sort) {
            if (sort === 'price-low-high') {
                sortCriteria.price = 1; // Low to high (ascending)
            } else if (sort === 'price-high-low') {
                sortCriteria.price = -1; // High to low (descending)
            } else if (sort === 'newest') {
                sortCriteria.createdAt = -1; // Newest first (descending)
            }
        }

        // Fetch products based on the query and sorting criteria
        const products = await Product.find(query).sort(sortCriteria);

        // Ensure that the image field has the full URL or path
        const productsWithImageUrl = products.map(product => ({
            ...product.toObject(),
            image: product.image ? `/uploads/${product.image}` : null, // Ensure the image field is a full URL or path
        }));

        sendSuccess(res, 'Products fetched successfully', productsWithImageUrl, 200);
    } catch (error) {
        sendError(res, error.message, 500);
    }
});



// Get a single product by ID (No auth needed)
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch the product from the database using the provided ID
        const product = await Product.findById(id);

        if (!product) {
            return sendError(res, 'Product not found', 404);
        }

        // Ensure that the image field has the full URL or path
        const productWithImageUrl = {
            ...product.toObject(),
            image: product.image ? `/uploads/${product.image}` : null, // Ensure the image field is a full URL or path
        };

        sendSuccess(res, 'Product fetched successfully', productWithImageUrl, 200);
    } catch (error) {
        sendError(res, error.message, 500);
    }
});

export default router;
