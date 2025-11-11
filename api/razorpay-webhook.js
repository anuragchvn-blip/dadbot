/**
 * Razorpay webhook handler
 * Verifies payment and creates pass records
 */

import { verifyWebhookSignature, parseTelegramId } from '../lib/razorpay.js';
import { createPassForUser } from '../lib/db.js';
import { sendMessage } from '../lib/telegram.js';

/**
 * Main webhook handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-razorpay-signature'];
    
    if (!signature) {
      console.error('Missing signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }
    
    // Verify signature
    const isValid = verifyWebhookSignature(rawBody, signature);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const event = req.body;
    
    // Handle payment events
    if (event.event === 'payment_link.paid' || event.event === 'payment.captured') {
      await handlePaymentSuccess(event);
    }
    
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(event) {
  try {
    // Extract reference_id from payment link or payment entity
    const payload = event.payload?.payment_link?.entity || event.payload?.payment?.entity;
    
    if (!payload) {
      console.error('Missing payload in webhook event');
      return;
    }
    
    const referenceId = payload.reference_id || payload.notes?.reference_id;
    
    if (!referenceId) {
      console.error('Missing reference_id in payment');
      return;
    }
    
    // Parse Telegram ID from reference
    const tgId = parseTelegramId(referenceId);
    
    if (!tgId) {
      console.error('Invalid reference_id format:', referenceId);
      return;
    }
    
    // Create pass for user
    const pass = await createPassForUser(tgId, referenceId);
    
    if (!pass) {
      console.error('Failed to create pass for user:', tgId);
      return;
    }
    
    // Notify user
    const validityHours = parseInt(process.env.PASS_VALIDITY_HOURS || '24', 10);
    const durationSec = parseInt(process.env.PASS_DURATION_SECONDS || '120', 10);
    
    await sendMessage(
      tgId,
      `✅ Payment successful!\n\n` +
      `🎟️ You have received a Daily Pass!\n\n` +
      `This pass grants you one ${durationSec}-second timed chat session.\n` +
      `Valid for ${validityHours} hours.\n\n` +
      `Use /matches to see your matches and start chatting!`
    );
    
    console.log(`Pass created for user ${tgId}:`, pass.id);
  } catch (error) {
    console.error('Handle payment success error:', error);
  }
}
