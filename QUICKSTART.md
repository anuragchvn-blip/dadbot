# 🚀 Quick Start Guide - DonutDot Bot (@DonutDot_bot)

Get your DonutDot matchmaking bot up and running in 15 minutes!

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Telegram account
- [ ] Razorpay account (free signup)
- [ ] Supabase account (free tier) OR use SQLite locally

## Step 1: Get Your Credentials (5 min)

### Telegram Bot Token
1. Open Telegram and message [@BotFather](https://t.me/botfather)
2. Send `/newbot`
3. Follow prompts: 
   - Name: `DonutDot` (or your choice)
   - Username: `DonutDot_bot` (must end with `_bot`)
4. Copy your token (looks like `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Razorpay Keys (Test Mode)
1. Sign up at [razorpay.com](https://razorpay.com)
2. Go to Settings → API Keys → Generate Test Key
3. Copy Key ID and Key Secret

### Supabase Setup
1. Sign up at [supabase.com](https://supabase.com)
2. Create new project (choose region, set password)
3. Wait 2 minutes for provisioning
4. Go to Settings → API → Copy URL and anon key

## Step 2: Clone & Configure (3 min)

```bash
# Clone repository
git clone <your-repo-url>
cd dadbot

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
TELEGRAM_TOKEN=your_token_from_botfather
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_supabase_anon_key
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
ADMIN_SECRET=make_this_a_random_string_123456
```

## Step 3: Setup Database (2 min)

### Option A: Supabase (Recommended)

1. In Supabase dashboard, go to SQL Editor
2. Open `migrations/migrate.sql` from your project
3. Copy entire contents
4. Paste into Supabase SQL Editor
5. Click "Run"
6. You should see 9 tables created

### Option B: SQLite (Local Testing)

```bash
npm run init-db
```

## Step 4: Deploy to Vercel (3 min)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: dadbot (or your choice)
# - Deploy? Yes
```

After deployment completes, copy your deployment URL (e.g., `https://dadbot-xxxxx.vercel.app`)

### Set Environment Variables in Vercel

```bash
# Set each variable
vercel env add TELEGRAM_TOKEN
vercel env add SUPABASE_URL
vercel env add SUPABASE_KEY
vercel env add RAZORPAY_KEY_ID
vercel env add RAZORPAY_KEY_SECRET
vercel env add RAZORPAY_WEBHOOK_SECRET
vercel env add ADMIN_SECRET
vercel env add VERCEL_URL

# Redeploy to apply env vars
vercel --prod
```

Or set them in the Vercel dashboard: Project → Settings → Environment Variables

## Step 5: Configure Webhooks (2 min)

### Set Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://your-app.vercel.app/api/telegram\"}"
```

Replace:
- `<YOUR_TOKEN>` with your actual bot token
- `your-app.vercel.app` with your Vercel URL

Verify it worked:

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
```

You should see `"url": "https://your-app.vercel.app/api/telegram"`

### Set Razorpay Webhook

**⚠️ Note: Do this AFTER you deploy to Vercel (need the URL first)**

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Settings → Webhooks → "Add New Webhook"
3. URL: `https://your-app.vercel.app/api/razorpay-webhook` (use your actual Vercel URL)
4. Active Events: Check `payment_link.paid` and `payment.captured`
5. Click "Create Webhook"
6. **Razorpay will generate a webhook secret** (looks like `whsec_xxxxxxxxxxxxx`)
7. Copy this secret
8. Add to Vercel:
   - Vercel Dashboard → Your Project → Settings → Environment Variables
   - Key: `RAZORPAY_WEBHOOK_SECRET`
   - Value: `whsec_xxxxxxxxxxxxx` (paste the secret)
   - Click "Save"
9. Redeploy: Run `vercel --prod` or click "Redeploy" in Vercel dashboard

## Step 6: Test! (5 min)

### Test Onboarding

1. Open Telegram
2. Search for your bot username (the one you gave BotFather)
3. Send `/start`
4. Follow prompts: name, age, location
5. You should see "Profile created!" message

### Test Browse

```
Send: /browse
```

You'll see "No more profiles" (since you're the only user!)

### Test Payment Link

```
Send: /pass
```

You should receive a Razorpay payment link. You can:
- Click it to see the payment page
- Use test card: 4111 1111 1111 1111 (any future date, any CVV)

### Create Second Test Account

1. Open Telegram in incognito/different browser
2. Message bot with different account
3. Complete onboarding
4. Now both accounts can browse each other!

### Test Matching

With two test accounts:
1. Account A: `/browse` → Like Account B
2. Account B: `/browse` → Like Account A
3. Both should see "It's a Match!" 💕

## Common Issues

### "Webhook not working"

Check webhook status:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

If `pending_update_count` is growing, webhook is failing. Check:
- URL is correct and starts with `https://`
- Vercel deployment succeeded
- No errors in Vercel logs

Fix: Delete webhook and set again
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
# Then set it again
```

### "Database error"

**Supabase:**
- Verify URL and key are correct
- Check project is not paused (free tier pauses after inactivity)
- Verify SQL migration ran successfully

**SQLite:**
- Run `npm run init-db` again
- Check `local.db` file exists
- Verify file permissions

### "Payment webhook not working"

1. Check Razorpay webhook configuration
2. Verify `RAZORPAY_WEBHOOK_SECRET` matches dashboard
3. Test with Razorpay's webhook testing tool
4. Check Vercel logs for errors

### "Environment variables not loaded"

Vercel requires redeploy after adding env vars:
```bash
vercel --prod
```

Or trigger redeploy from dashboard: Deployments → ... → Redeploy

## Next Steps

- [ ] Test all features thoroughly
- [ ] Customize bot messages/text
- [ ] Set up monitoring (Vercel Analytics)
- [ ] Configure domain (optional)
- [ ] Switch Razorpay to live mode (when ready)
- [ ] Set up error tracking (Sentry)
- [ ] Add more users and iterate!

## Useful Commands

```bash
# Local development (requires ngrok for webhooks)
npm run dev

# Run tests
npm test

# Check webhook status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Send test message to user
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":YOUR_CHAT_ID,"text":"Test message"}'

# View Vercel logs
vercel logs

# Check Supabase tables
# Go to Supabase dashboard → Table Editor
```

## Need Help?

1. Check [README.md](README.md) for detailed docs
2. Review [DEV_NOTES.md](DEV_NOTES.md) for troubleshooting
3. Check Vercel logs for errors
4. Verify all environment variables are set
5. Open GitHub issue with error details

## Production Checklist

Before going live:

- [ ] Test all flows end-to-end
- [ ] Switch Razorpay to live mode
- [ ] Set up proper domain
- [ ] Configure email provider for verification
- [ ] Add content filtering
- [ ] Set up monitoring/alerts
- [ ] Create backup strategy
- [ ] Add rate limiting (Redis)
- [ ] Test error scenarios
- [ ] Prepare support/FAQ
- [ ] Set pricing strategy
- [ ] Legal: Terms, Privacy Policy

---

**Estimated Total Time: 15-20 minutes**

🎉 **Congratulations!** Your DonutDot bot (@DonutDot_bot) is now live!
