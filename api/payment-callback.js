/**
 * Payment callback endpoint (optional)
 * This is called after successful payment from Razorpay Payment Link
 * Used for redirecting user back to bot
 */

export default async function handler(req, res) {
  // Razorpay redirects here after payment with query params
  const { payment_id, payment_link_id, payment_link_reference_id, payment_link_status } = req.query;
  
  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 50px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px;
          max-width: 500px;
        }
        h1 {
          font-size: 48px;
          margin: 0 0 20px 0;
        }
        p {
          font-size: 18px;
          line-height: 1.6;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          background: white;
          color: #667eea;
          padding: 15px 30px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: bold;
          margin-top: 20px;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: scale(1.05);
        }
        .emoji {
          font-size: 72px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="emoji">✅</div>
        <h1>Payment Successful!</h1>
        <p>Your Daily Pass has been activated.</p>
        <p>Return to Telegram to start chatting with your matches!</p>
        <a href="https://t.me/${process.env.BOT_USERNAME || 'your_bot'}" class="button">
          Open Telegram Bot
        </a>
      </div>
    </body>
    </html>
  `);
}
