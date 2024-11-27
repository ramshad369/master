import { Schema, model } from 'mongoose';

const productSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    imageUrl: { type: String },
    stock: { type: Number, required: true },
}, { timestamps: true });

export default model('Product', productSchema);
