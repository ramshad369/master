// utils/currencyConverter.js
import ExchangeRate from '../models/ExchangeRate.js';

let cachedRates = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 mins

export async function convertPrice(basePrice, targetCurrency) {
  const now = Date.now();

  // Refresh cache if expired
  if (!cachedRates || now - lastFetchTime > CACHE_TTL) {
    const latestRates = await ExchangeRate.findOne().sort({ updatedAt: -1 });
    if (!latestRates) throw new Error('Exchange rates not available.');

    cachedRates = latestRates.rates;
    lastFetchTime = now;
  }

  const rate = cachedRates.get(targetCurrency);
  if (!rate) throw new Error(`Exchange rate for ${targetCurrency} not available.`);

  const convertedPrice = basePrice * rate;
  return { convertedPrice, rate };
}
