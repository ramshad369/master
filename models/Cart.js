import { Schema, model } from 'mongoose';

const cartItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    color: { type: String, required: true },
    size: { type: String, required: true }
}, { timestamps: true });

const cartSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [cartItemSchema],  // Array of products and quantities
}, { timestamps: true });

export default model('Cart', cartSchema);
