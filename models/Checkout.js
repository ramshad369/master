import { Schema, model } from 'mongoose';

const checkoutSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    products: [{
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // Price at the time of checkout
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    address: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default model('Checkout', checkoutSchema);
