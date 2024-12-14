import { Router } from 'express';
import Product from '../models/Product.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import { S3Client } from '@aws-sdk/client-s3'; // AWS SDK v3 import
import { Upload } from '@aws-sdk/lib-storage'; // AWS SDK v3 lib-storage import
import { createProductSchema, updateProductSchema, deleteProductSchema } from '../validator/productValidator.js';
import { validateRequest } from '../middlewares/validator.js';

const router = Router();
const { authenticateToken, authorizeRole } = authMiddleware;

// Configure AWS S3 client with SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer storage
const storage = multer.memoryStorage(); // Store files in memory temporarily

const upload = multer({ storage });

router.post(
    '/',
    authenticateToken,
    authorizeRole('admin'),
    upload.single('image'), // Handles the file upload
    validateRequest(createProductSchema),
    async (req, res) => {
        const { title, category, price, originalPrice, discount, rating, stocks } = req.body;
        const file = req.file;

        if (!file) {
            return sendError(res, 'Image is required. Please upload an image.', 400);
        }

        try {
            // Upload the image to S3
            const uploadParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `products/${Date.now()}-${file.originalname}`,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read',
            };

            const upload = new Upload({
                client: s3Client,
                params: uploadParams,
                queueSize: 4,
                partSize: 5 * 1024 * 1024,
            });

            const { Location } = await upload.done(); // Uploaded image URL

            const newProduct = new Product({
                title,
                category,
                price,
                originalPrice,
                discount,
                rating,
                image: Location,
                stocks,
            });

            await newProduct.save();
            sendSuccess(res, 'Product created successfully', { product: newProduct }, 201);
        } catch (error) {
            console.error(error);
            sendError(res, 'There was an issue creating the product. Please try again later.', 500);
        }
    }
);


// Update a product route (Admin only)
router.put('/:id',
  authenticateToken, 
  authorizeRole('admin'), 
  upload.single('image'), // Handle image upload (if provided)
  validateRequest(updateProductSchema), // Validating the request body for product update
  async (req, res) => {
    const { id } = req.params;
    const { title, category, price, originalPrice, discount, rating, stocks } = req.body;
    const file = req.file;

    try {
      // Retrieve the existing product from the database
      const existingProduct = await Product.findById(id);

      if (!existingProduct) {
        return sendError(res, 'Product not found. Please check the product ID or try again later.', 404);
      }

      let imageUrl = existingProduct.image;

      // If a new image is uploaded, upload it to S3 and update the image URL
      if (file) {
        const uploadParams = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `products/${Date.now()}-${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
        };

        const upload = new Upload({
          client: s3Client,
          params: uploadParams,
          queueSize: 4,
          partSize: 5 * 1024 * 1024,
        });

        const { Location } = await upload.done(); // S3 URL of the uploaded image
        imageUrl = Location;
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
        { new: true }
      );

      sendSuccess(res, 'Product updated successfully', { product: updatedProduct }, 200);
    } catch (error) {
      console.error(error);
      sendError(res, 'There was an issue updating the product. Please try again later.', 500);
    }
  });

// Delete a product route (Admin only)
router.delete('/:id', 
    authenticateToken, 
    authorizeRole('admin'), 
    async (req, res) => {
        const { id } = req.params; // Extract productId from params

        try {
            // Delete the product from the database
            const deletedProduct = await Product.findByIdAndDelete(id);
            
            if (!deletedProduct) {
                return sendError(res, 'Product not found. Please check the product ID or try again later.', 404);
            }

            // Send success response
            sendSuccess(res, 'Product deleted successfully', { product: deletedProduct }, 200);
        } catch (error) {
            sendError(res, 'There was an issue deleting the product. Please try again later.', 500);
        }
    }
);

// Fetch all products (with optional filters for title and category)
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
            image: product.image ? product.image : null, // The image URL is stored directly from S3
        }));

        sendSuccess(res, 'Products fetched successfully', productsWithImageUrl, 200);
    } catch (error) {
        sendError(res, 'There was an issue fetching the products. Please try again later.', 500);
    }
});

// Get a single product by ID (No auth needed)
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch the product from the database using the provided ID
        const product = await Product.findById(id);

        if (!product) {
            return sendError(res, 'Product not found. Please check the product ID or try again later.', 404);
        }

        // Ensure that the image field has the full URL or path
        const productWithImageUrl = {
            ...product.toObject(),
            image: product.image ? product.image : null, // The image URL is stored directly from S3
        };

        sendSuccess(res, 'Product fetched successfully', productWithImageUrl, 200);
    } catch (error) {
        sendError(res, 'There was an issue fetching the product. Please try again later.', 500);
    }
});

export default router;
