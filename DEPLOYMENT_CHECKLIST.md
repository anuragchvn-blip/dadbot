# 📋 Deployment Checklist - DonutDot Bot

Use this checklist to ensure you complete all steps in the correct order.

## Pre-Deployment Setup ✅

- [ ] **Node.js 18+** installed
- [ ] **npm install** completed successfully
- [ ] **npm run verify** shows all checks passed
- [ ] **.env file** configured with:
  - [ ] `TELEGRAM_TOKEN` (from @BotFather)
  - [ ] `SUPABASE_URL` and `SUPABASE_KEY` (from Supabase dashboard)
  - [ ] `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (from Razorpay dashboard)
  - [ ] `ADMIN_SECRET` (set to `admin_<your_username>` or random string)
  - [ ] Leave `RAZORPAY_WEBHOOK_SECRET` empty for now (will be filled after deployment)

## Database Setup ✅

- [ ] **Supabase account** created at [supabase.com](https://supabase.com)
- [ ] **New project** created in Supabase
- [ ] **Database migration** run:
  - [ ] Go to SQL Editor in Supabase
  - [ ] Copy/paste entire contents of `migrations/migrate.sql`
  - [ ] Click "Run"
  - [ ] Verify 9 tables created in Table Editor
- [ ] **Credentials copied** to `.env`:
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_KEY (anon public key)

## Telegram Bot Setup ✅

- [ ] **Bot created** via [@BotFather](https://t.me/botfather):
  - [ ] Sent `/newbot` to BotFather
  - [ ] Set bot name: `DonutDot` (or your choice)
  - [ ] Set bot username: `DonutDot_bot` (or your choice, must end with `_bot`)
  - [ ] Copied bot token to `.env`
- [ ] **Bot configured** (optional but recommended):
  - [ ] Set description: `/setdescription` to BotFather
  - [ ] Set about text: `/setabouttext` to BotFather
  - [ ] Set commands: `/setcommands` → paste commands list (see below)

### Bot Commands for BotFather

```
start - Start bot or create profile
profile - View/edit your profile
browse - Browse and match with profiles
matches - View your matches
pass - Buy Daily Pass (₹30 for 2-min chat)
verify_email - Verify university email
help - Show help message
```

## Deployment to Vercel ✅

- [ ] **Vercel CLI** installed: `npm install -g vercel`
- [ ] **Logged in** to Vercel: `vercel login`
- [ ] **Deployed** to Vercel: `vercel`
  - [ ] Followed prompts
  - [ ] Noted deployment URL (e.g., `https://dadbot-xxx.vercel.app`)
- [ ] **Environment variables** set in Vercel:
  - [ ] Go to Vercel Dashboard → Your Project → Settings → Environment Variables
  - [ ] Add all variables from `.env` (except `RAZORPAY_WEBHOOK_SECRET` - will add later)
  - [ ] For each variable: Select "Production", "Preview", and "Development"
- [ ] **Production deployment** completed: `vercel --prod`

## Post-Deployment Configuration ✅

### 1. Set Telegram Webhook

- [ ] **Webhook URL** set:
  ```bash
  curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
    -H "Content-Type: application/json" \
    -d '{"url":"https://your-actual-url.vercel.app/api/telegram"}'
  ```
  Replace:
  - `<YOUR_TOKEN>` with your actual bot token
  - `your-actual-url.vercel.app` with your Vercel URL

- [ ] **Webhook verified**:
  ```bash
  curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
  ```
  Should show your webhook URL and no errors

### 2. Configure Razorpay Webhook

**⚠️ Important: This MUST be done after deployment**

- [ ] **Go to Razorpay Dashboard**: [dashboard.razorpay.com](https://dashboard.razorpay.com)
- [ ] **Navigate** to Settings → Webhooks
- [ ] **Click** "Add New Webhook"
- [ ] **Enter webhook URL**: `https://your-actual-url.vercel.app/api/razorpay-webhook`
- [ ] **Select events**:
  - [ ] `payment_link.paid` ✓
  - [ ] `payment.captured` ✓
- [ ] **Click** "Create Webhook"
- [ ] **Copy the webhook secret** (Razorpay generates it, looks like `whsec_xxxxxxxxxxxxx`)
- [ ] **Add to Vercel**:
  - [ ] Vercel Dashboard → Your Project → Settings → Environment Variables
  - [ ] Add new variable:
    - Key: `RAZORPAY_WEBHOOK_SECRET`
    - Value: `whsec_xxxxxxxxxxxxx` (paste the secret from Razorpay)
    - Environments: Production, Preview, Development
  - [ ] Click "Save"
- [ ] **Redeploy**: Run `vercel --prod` or click "Redeploy" in Vercel dashboard

## Testing ✅

### Basic Functionality

- [ ] **Bot responds** to messages:
  - [ ] Open Telegram and search for your bot
  - [ ] Send `/start`
  - [ ] Bot should respond with welcome message

- [ ] **Onboarding works**:
  - [ ] Bot asks for name → respond
  - [ ] Bot asks for age → respond
  - [ ] Bot asks for location → respond
  - [ ] Bot confirms profile created

- [ ] **Commands work**:
  - [ ] `/profile` - Shows your profile
  - [ ] `/browse` - Shows "No more profiles" (you're the only user)
  - [ ] `/help` - Shows help message

### Payment Flow (Test Mode)

**⚠️ Make sure you're using Razorpay TEST keys (not live keys) for testing**

- [ ] **Payment link generation**:
  - [ ] Send `/pass` to bot
  - [ ] Bot should respond with payment link
  - [ ] Link should open Razorpay payment page

- [ ] **Test payment**:
  - [ ] Click payment link
  - [ ] Use test card: `4111 1111 1111 1111`
  - [ ] Any future expiry date, any CVV
  - [ ] Complete payment

- [ ] **Webhook received**:
  - [ ] Check Vercel logs (Vercel Dashboard → Your Project → Logs)
  - [ ] Should see webhook received and pass created
  - [ ] Bot should send confirmation message

### Match Flow (requires 2 accounts)

- [ ] **Create second test account**:
  - [ ] Open Telegram in incognito/different device
  - [ ] Message your bot
  - [ ] Complete onboarding with different details

- [ ] **Test matching**:
  - [ ] Account A: `/browse` → Like Account B
  - [ ] Account B: `/browse` → Like Account A
  - [ ] Both should receive "It's a Match!" notification

- [ ] **Test with pass**:
  - [ ] One account buys a pass
  - [ ] Create a match
  - [ ] Should offer to start timed chat

## Admin Endpoints Testing ✅

- [ ] **List reports**:
  ```bash
  curl "https://your-app.vercel.app/api/admin?action=reports" \
    -H "X-Admin-Secret: admin_anuragchvn"
  ```
  (Replace with your actual admin secret)

- [ ] **Grant pass** (optional test):
  ```bash
  curl -X POST "https://your-app.vercel.app/api/admin?action=grant_pass" \
    -H "X-Admin-Secret: admin_anuragchvn" \
    -H "Content-Type: application/json" \
    -d '{"tg_id": YOUR_TELEGRAM_ID}'
  ```

## Production Readiness ✅

- [ ] **Switch to Razorpay Live Mode**:
  - [ ] Generate live API keys in Razorpay
  - [ ] Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Vercel
  - [ ] Recreate webhook with live credentials
  - [ ] Redeploy

- [ ] **Secure Admin Secret**:
  - [ ] Change `ADMIN_SECRET` to a strong random string
  - [ ] Update in Vercel environment variables
  - [ ] Store securely

- [ ] **Set up monitoring**:
  - [ ] Enable Vercel Analytics
  - [ ] Set up error tracking (Sentry, optional)
  - [ ] Configure Supabase alerts

- [ ] **Custom domain** (optional):
  - [ ] Add custom domain in Vercel
  - [ ] Update Telegram webhook URL
  - [ ] Update Razorpay webhook URL
  - [ ] Update `VERCEL_URL` environment variable

## Go Live! 🚀

- [ ] **Announce your bot**:
  - [ ] Share bot link: `https://t.me/DonutDot_bot`
  - [ ] Test with real users
  - [ ] Monitor for errors

- [ ] **Monitor initial usage**:
  - [ ] Check Vercel logs regularly
  - [ ] Watch Supabase dashboard
  - [ ] Verify payments are being processed
  - [ ] Check webhook deliveries in Razorpay

## Post-Launch ✅

- [ ] **User feedback**:
  - [ ] Gather initial feedback
  - [ ] Fix any bugs discovered
  - [ ] Improve user experience

- [ ] **Scale preparation**:
  - [ ] Monitor Supabase row count (free tier = 50K rows)
  - [ ] Plan upgrade if needed
  - [ ] Consider Redis for state management (Upstash)

- [ ] **Content moderation**:
  - [ ] Review reports regularly via `/api/admin?action=reports`
  - [ ] Ban abusive users
  - [ ] Update content filters if needed

---

## Quick Commands Reference

### Verify Setup
```bash
npm run verify
```

### Deploy
```bash
vercel --prod
```

### Set Telegram Webhook
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-app.vercel.app/api/telegram"
```

### Check Webhook Status
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### View Vercel Logs
```bash
vercel logs
```

### Admin Commands
```bash
# List reports
curl "https://your-app.vercel.app/api/admin?action=reports" \
  -H "X-Admin-Secret: your_secret"

# Ban user
curl -X POST "https://your-app.vercel.app/api/admin?action=ban" \
  -H "X-Admin-Secret: your_secret" \
  -d '{"tg_id": 123456789}'
```

---

## Need Help?

- 📖 Full docs: `README.md`
- 🚀 Quick start: `QUICKSTART.md`
- 💾 Database setup: `SETUP_DATABASE.md`
- 🔧 Troubleshooting: `DEV_NOTES.md`

## Completion Summary

When all checkboxes above are ✅, your DonutDot Bot is fully deployed and ready for users!

**Total estimated time**: 30-45 minutes (first time)

---

*Last updated: 2025-11-11*
