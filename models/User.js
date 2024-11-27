import { Schema, model } from 'mongoose';

const userSchema = new Schema({
    firstName: { type: String, required: true},
    lastName: { type: String, required: false},
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' }, // Role differentiation
    email:{ type: String, required: false , unique:true},
    address:{ type: String, required: false },
    phone:{ type: String, required: true ,unique:true}
}, { timestamps: true });

export default model('User', userSchema);
