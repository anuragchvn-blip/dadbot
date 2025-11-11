# 🚀 Quick Deployment Guide

Your setup is complete! Here's how to deploy:

## ✅ What's Working

- ✅ Telegram Bot connected (@DonutDot_Bot)
- ✅ Supabase database configured
- ✅ Razorpay credentials valid
- ✅ All environment variables set

## 🚀 Deploy Now (3 Steps)

### Step 1: Deploy to Vercel

```bash
# Deploy to production
vercel --prod
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No (create new) or Yes (use DADBOT)
- **Project name?** → `donutdot-bot` (or keep DADBOT)
- **Directory?** → `.` (current directory)
- **Override settings?** → No

Vercel will:
1. Upload your code
2. Ask you to set environment variables (add them in Vercel dashboard)
3. Give you a URL like: `https://donutdot-bot.vercel.app`

### Step 2: Set Environment Variables in Vercel

After deployment, go to Vercel Dashboard:
1. Select your project
2. Settings → Environment Variables
3. Add each variable from your `.env` file:
   - TELEGRAM_TOKEN
   - SUPABASE_URL
   - SUPABASE_KEY
   - RAZORPAY_KEY_ID
   - RAZORPAY_KEY_SECRET
   - ADMIN_SECRET
   - DAILY_PASS_AMOUNT_PAISA
   - PASS_DURATION_SECONDS
   - PASS_VALIDITY_HOURS
   - (Skip RAZORPAY_WEBHOOK_SECRET for now)
4. For each: Select "Production", "Preview", "Development"
5. Click "Save"
6. Redeploy: `vercel --prod`

### Step 3: Set Telegram Webhook

Replace `<YOUR_TOKEN>` and `<YOUR_URL>` with your actual values:

```bash
curl -X POST "https://api.telegram.org/bot8198416791:AAGi4EELXF-YGqCQMG3qGkliY9LdgnjFxYQ/setWebhook" -H "Content-Type: application/json" -d "{\"url\":\"https://your-vercel-url.vercel.app/api/telegram\"}"
```

Verify:
```bash
curl "https://api.telegram.org/bot8198416791:AAGi4EELXF-YGqCQMG3qGkliY9LdgnjFxYQ/getWebhookInfo"
```

### Step 4: Configure Razorpay Webhook

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Settings → Webhooks → Add New Webhook
3. URL: `https://your-vercel-url.vercel.app/api/razorpay-webhook`
4. Events: Check `payment_link.paid` and `payment.captured`
5. Copy the webhook secret Razorpay generates
6. Add to Vercel: Environment Variables → `RAZORPAY_WEBHOOK_SECRET`
7. Redeploy: `vercel --prod`

## 🧪 Test Your Bot

1. Open Telegram
2. Search for: @DonutDot_Bot
3. Send: `/start`
4. Follow the onboarding prompts

## 📋 Alternative: Use Vercel Dashboard

If CLI is problematic:

1. Go to [vercel.com](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import from Git (connect your GitHub repo)
4. Add environment variables
5. Deploy

## ⚠️ Note About `vercel dev`

`vercel dev` is for local testing with ngrok or similar. Since you have:
- Working bot (@DonutDot_Bot)
- Configured database (Supabase)
- Valid API credentials

You can deploy directly to production for testing. The free tier is generous!

## 🆘 Having Issues?

Run diagnostics:
```bash
npm run test:setup
```

This will show you exactly what's configured and what needs attention.

---

**Ready to deploy?** Run: `vercel --prod`
