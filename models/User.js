import { Schema, model } from 'mongoose';
import addressSchema from './address.js';

const userSchema = new Schema({
    countryCode: { 
        type: String, 
        required: true, 
        validate: {
            validator: (v) => /^\+\d{1,3}$/.test(v),
            message: 'Country code must be in the format "+XXX"',
        },
    },
    phone: { 
        type: String, 
        required: true, 
        unique: true, 
        validate: {
            validator: (v) => /^\d{7,10}$/.test(v),
            message: 'Phone number must contain 7 to 10 digits',
        },
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: false },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
    email: { type: String, required: false, unique: true },
    address: { type: [addressSchema], default: [] },
    otp: { type: String },
    otpExpiry: { type: Date },
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true });

export default model('User', userSchema);
