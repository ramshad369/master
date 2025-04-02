import { Schema, model } from 'mongoose';

const addressSchema = new Schema({
  name: { type: String, required: true },
  address1: { type: String, required: true },
  address2: { type: String, required: false },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true},
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
      validate: {
          validator: (v) => /^\d{7,10}$/.test(v),
          message: 'Phone number must contain 7 to 10 digits',
      },
  },
  isDefault:{ type: Boolean, default:false}
});


export default addressSchema;