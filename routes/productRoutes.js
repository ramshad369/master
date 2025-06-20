import { Router } from 'express';
import Product from '../models/Product.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import multer from 'multer';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createProductSchema, updateProductSchema } from '../validator/productValidator.js';
import { validateRequest } from '../middlewares/validator.js';
import { convertPrice } from '../utils/currencyConverter.js';

const router = Router();
const { authenticateToken, authorizeRole } = authMiddleware;

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: "https://s3-accelerate.amazonaws.com", // Correct endpoint
  forcePathStyle: false, // Ensures proper bucket addressing
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

import csvParser from "csv-parser";
import streamifier from "streamifier";

router.post(
  "/",
  authenticateToken,
  authorizeRole("admin"),
  upload.fields([
    { name: "image", maxCount: 5 },
    { name: "csv", maxCount: 1 },
  ]),
  async (req, res) => {
    const imageFiles = req.files?.image || [];
    const csvFile = req.files?.csv?.[0];

    // ✅ If CSV file is provided, handle bulk upload
    if (csvFile) {
      const results = [];
      const failed = [];

      try {
        await new Promise((resolve, reject) => {
          streamifier
            .createReadStream(csvFile.buffer)
            .pipe(csvParser())
            .on("data", (row) => results.push(row))
            .on("end", resolve)
            .on("error", reject);
        });

        for (const row of results) {
          try {
            const {
              title,
              category,
              price,
              originalPrice,
              discount,
              rating,
              stocks,
              subCategory,
              image, // Image URL
              description,
            } = row;

            if (!title || !price) {
              failed.push({ row, reason: "Missing required fields" });
              continue;
            }

            const newProduct = new Product({
              title,
              category,
              subCategory:subCategory||null,
              price: parseFloat(price),
              originalPrice: parseFloat(originalPrice || 0),
              discount: parseFloat(discount || 0),
              rating: parseFloat(rating || 0),
              stocks: parseInt(stocks || 0),
              image: image || "",
              description,
            });

            await newProduct.save();
          } catch (err) {
            failed.push({ row, reason: err.message });
          }
        }

        return sendSuccess(res, "CSV processed successfully", {
          total: results.length,
          added: results.length - failed.length,
          failed,
        });
      } catch (error) {
        console.error(error);
        return sendError(res, "Failed to process CSV. Try again.", 500);
      }
    }

    // ✅ If image is provided, handle single product upload
    if (!imageFiles) {
      return sendError(
        res,
        "Image is required for single product creation.",
        400
      );
    }

    const { title, category, price, originalPrice, discount, rating, stocks, description, subCategory } = req.body;

    try {
      const imageUrls = [];

      for (const file of imageFiles) {
        const uploadParams = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `products/${Date.now()}-${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: "public-read",
        };

        const uploadToS3 = new Upload({
          client: s3Client,
          params: uploadParams,
        });

        const { Location } = await uploadToS3.done();
        imageUrls.push(Location);
      }

      const newProduct = new Product({
        title,
        category,
        price: parseFloat(price),
        originalPrice: parseFloat(originalPrice || 0),
        discount: parseFloat(discount || 0),
        rating: parseFloat(rating || 0),
        stocks: parseInt(stocks || 0),
        image: imageUrls,
        description,
        subCategory: subCategory || null,
      });

      await newProduct.save();
      sendSuccess(
        res,
        "Product created successfully",
        { product: newProduct },
        201
      );
    } catch (error) {
      console.error(error);
      sendError(
        res,
        "There was an issue creating the product. Please try again later.",
        500
      );
    }
  }
);

/**
 * @route PUT /products/:id
 * @desc Update an existing product (Admin only)
 */
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  upload.array("images", 5), // Allow up to 5 images per product
  validateRequest(updateProductSchema),
  async (req, res) => {
    const { id } = req.params;
    const {
      title,
      category,
      price,
      originalPrice,
      discount,
      rating,
      stocks,
      description,
      subCategory,
    } = req.body;
    const imageFiles = req.files || [];

    try {
      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        return sendError(
          res,
          "Product not found. Please check the product ID or try again later.",
          404
        );
      }

      let imageUrls = [...(existingProduct.image || [])]; // preserve existing images

      for (const file of imageFiles) {
        const uploadParams = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `products/${Date.now()}-${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: "public-read",
        };

        const upload = new Upload({
          client: s3Client,
          params: uploadParams,
          queueSize: 5,
          partSize: 5 * 1024 * 1024,
        });

        const { Location } = await upload.done();
        imageUrls.push(Location);
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
          subCategory:subCategory,
          stocks: stocks !== undefined ? stocks : existingProduct.stocks,
          description,
        },
        { new: true }
      );

      sendSuccess(
        res,
        "Product updated successfully",
        { product: updatedProduct },
        200
      );
    } catch (error) {
      console.error(error);
      sendError(
        res,
        "There was an issue updating the product. Please try again later.",
        500
      );
    }
  }
);

/**
 * @route DELETE /products/:id
 * @desc Delete a product (Admin only)
 */
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const deletedProduct = await Product.findByIdAndDelete(id);

      if (!deletedProduct) {
        return sendError(
          res,
          "Product not found. Please check the product ID or try again later.",
          404
        );
      }

      sendSuccess(
        res,
        "Product deleted successfully",
        { product: deletedProduct },
        200
      );
    } catch (error) {
      console.error(error);
      sendError(
        res,
        "There was an issue deleting the product. Please try again later.",
        500
      );
    }
  }
);

/**
 * @route GET /products
 * @desc Fetch all products with optional filters and sorting
 */
router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      subCategory,
      minPrice,
      maxPrice,
      sort,
      currency = "USD",
    } = req.query;
    let query = {};
    console.log("req.query", req.query);

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    if (subCategory) {
      query.subCategory = { $regex: subCategory, $options: "i" };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = minPrice;
      if (maxPrice) query.price.$lte = maxPrice;
    }

    let sortCriteria = {};
    if (sort) {
      if (sort === "price-low-high") sortCriteria.price = 1;
      else if (sort === "price-high-low") sortCriteria.price = -1;
      else if (sort === "newest") sortCriteria.createdAt = -1;
    }

    const products = await Product.find(query).sort(sortCriteria);
    const productsWithConvertedPrice = await Promise.all(products.map(async p => {
      const { convertedPrice } = await convertPrice(p.price, currency);
      return {
        ...p.toObject(),
        price: parseFloat(convertedPrice.toFixed(2)),
        currency
      };
    }));

    sendSuccess(res, 'Products fetched successfully', productsWithConvertedPrice, 200);
  } catch (error) {
    console.error(error);
    sendError(
      res,
      "There was an issue fetching the products. Please try again later.",
      500
    );
  }
});

/**
 * @route GET /products/:id
 * @desc Fetch a single product by ID
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return sendError(
        res,
        "Product not found. Please check the product ID or try again later.",
        404
      );
    }

    sendSuccess(res, "Product fetched successfully", product, 200);
  } catch (error) {
    console.error(error);
    sendError(
      res,
      "There was an issue fetching the product. Please try again later.",
      500
    );
  }
});

export default router;
