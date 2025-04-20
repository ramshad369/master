import { Schema, model } from 'mongoose';

const productSchema = new Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: { type: String },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    discount: { type: Number },
    rating: { type: Number },
    image: { type: String, required: true },
    stocks: { type: Number, required: true, default: 0 },
    description: { type: String, required: true }, // New required field
}, { timestamps: true });

export default model('Product', productSchema);
