import { Schema, model } from 'mongoose';

const productSchema = new Schema({
    title: { type: String, required: true },           
    category: { type: String, required: true },        
    price: { type: Number, required: true },           
    originalPrice: { type: Number, required: true },   
    discount: { type: Number },                       
    rating: { type: Number },          
    image: { type: String },
    stocks: { type: Number, required: true, default: 0 }                           
}, { timestamps: true });

export default model('Product', productSchema);
