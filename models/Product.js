import { Schema, model } from 'mongoose';

const productSchema = new Schema({
    title: { type: String, required: true },           
    category: { type: String, required: true },        
    price: { type: Number, required: true },           
    originalPrice: { type: Number, required: true },   
    discount: { type: Number },                       
    rating: { type: Number, required: true },          
    image: { type: String },                           
}, { timestamps: true });

export default model('Product', productSchema);
