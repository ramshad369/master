// cron/updateExchangeRates.js
import cron from 'node-cron';
import axios from 'axios';
import ExchangeRate from '../models/ExchangeRate.js';

const BASE_CURRENCY = 'USD';
const SUPPORTED_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'AED'];

async function fetchExchangeRates() {
  try {
    // Example using exchangerate-api.com or similar free service
    const response = await axios.get(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`);
    const rates = response.data.rates;

    const filteredRates = {};
    SUPPORTED_CURRENCIES.forEach(currency => {
      filteredRates[currency] = rates[currency] || 1;
    });

    await ExchangeRate.findOneAndUpdate(
      {},
      { base: BASE_CURRENCY, rates: filteredRates, updatedAt: new Date() },
      { upsert: true }
    );

    console.log('✅ Exchange rates updated');
  } catch (error) {
    console.error('❌ Failed to update exchange rates:', error.message);
  }
}

export function scheduleExchangeRateUpdates() {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running exchange rate update job...');
    await fetchExchangeRates();
  });

  // Optionally run once on startup:
  fetchExchangeRates();
}
