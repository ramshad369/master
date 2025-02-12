// models/Order.js
import { Schema, model } from 'mongoose';

const orderSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true, min: 1 },
            color: { type: String },
            size: { type: String }
        }
    ],
    totalAmount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], 
        default: 'pending' 
    },
    address: { type: String, required: true },
    paymentMethod: { type: String, enum: ['cod', 'card', 'paypal'], required: true },
}, { timestamps: true });

export default model('Order', orderSchema);