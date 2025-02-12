import { Router } from 'express';
import Product from '../models/Product.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import multer from 'multer';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createProductSchema, updateProductSchema } from '../validator/productValidator.js';
import { validateRequest } from '../middlewares/validator.js';

const router = Router();
const { authenticateToken, authorizeRole } = authMiddleware;

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * @route POST /products
 * @desc Create a new product (Admin only)
 */
router.post(
  '/',
  authenticateToken,
  authorizeRole('admin'),
  upload.single('image'),
  validateRequest(createProductSchema),
  async (req, res) => {
    const { title, category, price, originalPrice, discount, rating, stocks, description } = req.body;
    const file = req.file;

    if (!file) {
      return sendError(res, 'Image is required. Please upload an image.', 400);
    }

    try {
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
        queueSize: 5, // Increases concurrent uploads
        partSize: 5 * 1024 * 1024, // 5MB parts for multipart upload
      });

      const { Location } = await upload.done();

      const newProduct = new Product({
        title,
        category,
        price,
        originalPrice,
        discount,
        rating,
        image: Location,
        stocks,
        description,
      });

      await newProduct.save();
      sendSuccess(res, 'Product created successfully', { product: newProduct }, 201);
    } catch (error) {
      console.error(error);
      sendError(res, 'There was an issue creating the product. Please try again later.', 500);
    }
  }
);

/**
 * @route PUT /products/:id
 * @desc Update an existing product (Admin only)
 */
router.put(
  '/:id',
  authenticateToken,
  authorizeRole('admin'),
  upload.single('image'),
  validateRequest(updateProductSchema),
  async (req, res) => {
    const { id } = req.params;
    const { title, category, price, originalPrice, discount, rating, stocks, description } = req.body;
    const file = req.file;

    try {
      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        return sendError(res, 'Product not found. Please check the product ID or try again later.', 404);
      }

      let imageUrl = existingProduct.image;
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
          queueSize: 5, // Increases concurrent uploads
          partSize: 5 * 1024 * 1024, // 5MB parts for multipart upload
        });

        const { Location } = await upload.done();
        imageUrl = Location;
      }

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
          stocks: stocks !== undefined ? stocks : existingProduct.stocks,
          description,
        },
        { new: true }
      );

      sendSuccess(res, 'Product updated successfully', { product: updatedProduct }, 200);
    } catch (error) {
      console.error(error);
      sendError(res, 'There was an issue updating the product. Please try again later.', 500);
    }
  }
);

/**
 * @route DELETE /products/:id
 * @desc Delete a product (Admin only)
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    const { id } = req.params;

    try {
      const deletedProduct = await Product.findByIdAndDelete(id);

      if (!deletedProduct) {
        return sendError(res, 'Product not found. Please check the product ID or try again later.', 404);
      }

      sendSuccess(res, 'Product deleted successfully', { product: deletedProduct }, 200);
    } catch (error) {
      console.error(error);
      sendError(res, 'There was an issue deleting the product. Please try again later.', 500);
    }
  }
);

/**
 * @route GET /products
 * @desc Fetch all products with optional filters and sorting
 */
router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sort } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = minPrice;
      if (maxPrice) query.price.$lte = maxPrice;
    }

    let sortCriteria = {};
    if (sort) {
      if (sort === 'price-low-high') sortCriteria.price = 1;
      else if (sort === 'price-high-low') sortCriteria.price = -1;
      else if (sort === 'newest') sortCriteria.createdAt = -1;
    }

    const products = await Product.find(query).sort(sortCriteria);
    sendSuccess(res, 'Products fetched successfully', products, 200);
  } catch (error) {
    console.error(error);
    sendError(res, 'There was an issue fetching the products. Please try again later.', 500);
  }
});

/**
 * @route GET /products/:id
 * @desc Fetch a single product by ID
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return sendError(res, 'Product not found. Please check the product ID or try again later.', 404);
    }

    sendSuccess(res, 'Product fetched successfully', product, 200);
  } catch (error) {
    console.error(error);
    sendError(res, 'There was an issue fetching the product. Please try again later.', 500);
  }
});

export default router;
