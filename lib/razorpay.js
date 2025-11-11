/**
 * Razorpay Payment Link helper functions
 */

import crypto from 'crypto';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

/**
 * Create a payment link for Daily Pass purchase
 * @param {object} params - Payment parameters
 * @param {number} params.tgId - Telegram chat ID
 * @param {number} params.amountPaise - Amount in paise (e.g., 3000 for ₹30)
 * @param {string} params.description - Payment description
 * @returns {Promise<object>} Payment link object with short_url
 */
export async function createPaymentLink({ tgId, amountPaise, description = 'DonutDot Daily Pass' }) {
  const referenceId = `telegram:${tgId}:${Date.now()}`;
  
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  
  try {
    const response = await fetch(`${RAZORPAY_API_BASE}/payment_links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        description,
        reference_id: referenceId,
        customer: {
          name: `Telegram User ${tgId}`
        },
        notify: {
          sms: false,
          email: false
        },
        reminder_enable: false,
        callback_url: `${process.env.VERCEL_URL}/api/payment-callback`,
        callback_method: 'get'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Razorpay createPaymentLink error:', errorData);
      throw new Error(`Razorpay API error: ${errorData.error?.description || 'Unknown error'}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('createPaymentLink error:', error);
    throw error;
  }
}

/**
 * Verify Razorpay webhook signature
 * @param {string} body - Raw webhook body
 * @param {string} signature - X-Razorpay-Signature header value
 * @returns {boolean} True if signature is valid
 */
export function verifyWebhookSignature(body, signature) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return false;
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('verifyWebhookSignature error:', error);
    return false;
  }
}

/**
 * Parse reference_id to extract Telegram chat ID
 * @param {string} referenceId - Reference ID in format "telegram:<chatId>:<ts>"
 * @returns {number|null} Telegram chat ID or null
 */
export function parseTelegramId(referenceId) {
  try {
    const parts = referenceId.split(':');
    if (parts.length === 3 && parts[0] === 'telegram') {
      return parseInt(parts[1], 10);
    }
    return null;
  } catch (error) {
    console.error('parseTelegramId error:', error);
    return null;
  }
}
