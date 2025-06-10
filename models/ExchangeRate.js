import { Schema, model } from 'mongoose';

const exchangeRateSchema = new Schema({
  base: { type: String, required: true, default: 'USD' },
  rates: { type: Map, of: Number, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export default model('ExchangeRate', exchangeRateSchema);
