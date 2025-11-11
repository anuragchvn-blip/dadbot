/**
 * Email verification endpoint
 * Verifies email verification tokens
 */

import { verifyEmailToken } from '../lib/db.js';
import { sendMessage } from '../lib/telegram.js';

/**
 * Main verification handler
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1>❌ Invalid Verification Link</h1>
          <p>The verification link is invalid or has expired.</p>
        </body>
        </html>
      `);
    }
    
    // Verify token
    const user = await verifyEmailToken(token);
    
    if (!user) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Verification Failed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1>❌ Verification Failed</h1>
          <p>The verification link is invalid or has expired.</p>
          <p>Please request a new verification email from the bot.</p>
        </body>
        </html>
      `);
    }
    
    // Notify user via Telegram
    await sendMessage(
      user.tg_id,
      `✅ Email verified successfully!\n\n` +
      `You now have a verified badge on your profile! ✅`
    );
    
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #27ae60; }
          .badge { font-size: 72px; }
        </style>
      </head>
      <body>
        <div class="badge">✅</div>
        <h1>Email Verified!</h1>
        <p>Your university email has been verified successfully.</p>
        <p>You can now close this window and return to Telegram.</p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1>❌ An Error Occurred</h1>
        <p>Please try again later.</p>
      </body>
      </html>
    `);
  }
}

/**
 * Send verification email (stub)
 * TODO: Integrate with SendGrid, Mailgun, or other email provider
 * 
 * @param {string} email - Email address to verify
 * @param {string} token - Verification token
 */
export async function sendVerificationEmail(email, token) {
  const verificationUrl = `${process.env.VERCEL_URL}/api/verify-email?token=${token}`;
  
  // TODO: Replace with actual email sending
  console.log('TODO: Send verification email');
  console.log('To:', email);
  console.log('Verification URL:', verificationUrl);
  
  /*
   * Example SendGrid integration:
   * 
   * const sgMail = require('@sendgrid/mail');
   * sgMail.setApiKey(process.env.EMAIL_API_KEY);
   * 
   * const msg = {
   *   to: email,
   *   from: process.env.EMAIL_FROM,
   *   subject: 'Verify your email for DonutDot',
   *   html: `
   *     <h1>Verify your email</h1>
   *     <p>Click the link below to verify your email:</p>
   *     <a href="${verificationUrl}">${verificationUrl}</a>
   *     <p>This link expires in 24 hours.</p>
   *   `
   * };
   * 
   * await sgMail.send(msg);
   */
  
  /*
   * Example Mailgun integration:
   * 
   * const formData = require('form-data');
   * const Mailgun = require('mailgun.js');
   * const mailgun = new Mailgun(formData);
   * const mg = mailgun.client({
   *   username: 'api',
   *   key: process.env.EMAIL_API_KEY
   * });
   * 
   * await mg.messages.create('your-domain.com', {
   *   from: process.env.EMAIL_FROM,
   *   to: [email],
   *   subject: 'Verify your email for DonutDot',
   *   html: `
   *     <h1>Verify your email</h1>
   *     <p>Click the link below to verify your email:</p>
   *     <a href="${verificationUrl}">${verificationUrl}</a>
   *     <p>This link expires in 24 hours.</p>
   *   `
   * });
   */
}
