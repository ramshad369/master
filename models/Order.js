import { Schema, model } from 'mongoose';
import addressSchema from './address.js';

const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  address: { type: addressSchema, required:true },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    title: String,
    quantity: Number,
    price: Number,
  }],
  status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
  paymentIntentId: String,
  paymentMethod: String,
  paymentStatus: String,
  deliveryStatus: { type: String, enum: ['pending', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  deliveryDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export default model('Order', orderSchema);
