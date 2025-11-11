# 🍩 DonutDot Bot (@DonutDot_bot) - Telegram Matchmaking Bot

A complete, production-ready Telegram matchmaking bot with Daily Pass monetization, anonymous Truth-or-Dare mode, and university email verification.

## 📋 Features

- **Text-only profiles** with name, age, location, university, and bio
- **Browse & match** - Like/Pass/Report profiles, mutual likes = matches
- **Daily Pass monetization** - ₹30 for one 2-minute timed chat session via Razorpay
- **Anonymous Truth-or-Dare** mode for matched users (coming soon)
- **Email verification** - Optional university email verification for verified badge
- **Admin moderation** - Review reports, ban/unban users, grant passes
- **Scalable architecture** - Vercel serverless + Supabase (Postgres) + SQLite fallback

## 🏗️ Architecture

```
┌─────────────────┐
│  Telegram Bot   │
│   (Webhook)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vercel Serverless│
│  /api/telegram   │
│  /api/razorpay   │
│  /api/admin      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│   Supabase      │◄────►│  Razorpay    │
│   (Postgres)    │      │  (Payments)  │
└─────────────────┘      └──────────────┘
```

## 📂 Project Structure

```
dadbot/
├── api/
│   ├── telegram.js           # Main bot webhook handler
│   ├── razorpay-webhook.js   # Payment webhook handler
│   ├── verify-email.js       # Email verification endpoint
│   └── admin.js              # Admin moderation endpoints
├── lib/
│   ├── supabaseClient.js     # Supabase/SQLite abstraction
│   ├── db.js                 # High-level database functions
│   ├── matcher.js            # Matching algorithm
│   ├── telegram.js           # Telegram API helpers
│   └── razorpay.js           # Razorpay helpers
├── migrations/
│   └── migrate.sql           # Database schema (Postgres/SQLite)
├── scripts/
│   └── init_db.js            # SQLite initialization script
├── tests/
│   └── matcher.test.js       # Unit tests
├── package.json
├── vercel.json
├── .env.example
└── README.md
```

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- Supabase account (recommended) or SQLite for local dev (requires build tools)
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Razorpay account (test/live keys)

### 2. Clone and Install

```bash
git clone <your-repo-url>
cd dadbot
npm install
```

**Note:** If you see SQLite build errors during install, that's OK! SQLite is optional. See `INSTALL_SUCCESS.md` for next steps.

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required variables:**

```env
# Telegram
TELEGRAM_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Supabase (or leave blank to use SQLite)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Admin
ADMIN_SECRET=your_secure_random_string

# Deployment URL (set after Vercel deploy)
VERCEL_URL=https://your-app.vercel.app

# Daily Pass Configuration
DAILY_PASS_AMOUNT_PAISA=3000
PASS_DURATION_SECONDS=120
PASS_VALIDITY_HOURS=24
```

### 4. Database Setup

#### Option A: Supabase (Recommended for Production)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `migrations/migrate.sql`
3. Copy your project URL and anon key to `.env`

#### Option B: SQLite (Local Development)

```bash
npm run init-db
```

This creates `local.db` with all required tables.

### 5. Test Locally

```bash
npm run dev
```

This starts Vercel dev server at `http://localhost:3000`.

**Note:** Telegram webhooks won't work on localhost. Use ngrok or deploy to test webhooks:

```bash
# Using ngrok (install from ngrok.com)
ngrok http 3000

# Set webhook (replace with your ngrok URL)
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-ngrok-url.ngrok.io/api/telegram"}'
```

### 6. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# or use: vercel env add
```

### 7. Set Telegram Webhook

After deployment, set your webhook URL:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-app.vercel.app/api/telegram"}'
```

Verify webhook is set:

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
```

### 8. Configure Razorpay Webhook

**⚠️ Important: Do this AFTER deployment, as you need your deployed URL**

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → Webhooks
2. Click "Add New Webhook"
3. Add webhook URL: `https://your-app.vercel.app/api/razorpay-webhook` (use your actual Vercel URL)
4. Select events: `payment_link.paid`, `payment.captured`
5. Click "Create Webhook"
6. **Copy the webhook secret** that Razorpay generates
7. Add it to Vercel environment variables:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `RAZORPAY_WEBHOOK_SECRET` = `whsec_xxxxx` (the secret you copied)
   - Redeploy: `vercel --prod`

## 📱 Bot Commands

- `/start` - Start bot or create profile
- `/profile` - View/edit profile
- `/browse` - Browse profiles and like/pass
- `/matches` - View your matches
- `/pass` - Buy Daily Pass (₹30)
- `/verify_email` - Verify university email
- `/help` - Show help

## 💳 Daily Pass Flow

1. User buys a pass via `/pass` command
2. Bot creates Razorpay Payment Link with `reference_id = "telegram:<chatId>:<timestamp>"`
3. User completes payment
4. Razorpay webhook notifies our server
5. Server verifies signature, creates `passes` record
6. Bot notifies user of successful purchase
7. When user starts a chat with a match, pass is consumed
8. Chat session expires after configured duration (default 120 seconds)

### Pass Lifecycle

- **Purchased**: Pass created with `expires_at = now + PASS_VALIDITY_HOURS`
- **Active**: Pass is unused (`used_at = null`) and not expired
- **Consumed**: Pass used when chat starts (`used_at` set to current time)
- **Expired**: Pass not used within validity period

## 🔧 Admin Endpoints

Protected by `X-Admin-Secret` header or `admin_secret` query param.

### Get Reports

```bash
curl "https://your-app.vercel.app/api/admin?action=reports&status=pending" \
  -H "X-Admin-Secret: your_secret"
```

### Ban User

```bash
curl -X POST "https://your-app.vercel.app/api/admin?action=ban" \
  -H "X-Admin-Secret: your_secret" \
  -H "Content-Type: application/json" \
  -d '{"tg_id": 123456789}'
```

### Unban User

```bash
curl -X POST "https://your-app.vercel.app/api/admin?action=unban" \
  -H "X-Admin-Secret: your_secret" \
  -H "Content-Type: application/json" \
  -d '{"tg_id": 123456789}'
```

### Grant Free Pass

```bash
curl -X POST "https://your-app.vercel.app/api/admin?action=grant_pass" \
  -H "X-Admin-Secret: your_secret" \
  -H "Content-Type: application/json" \
  -d '{"tg_id": 123456789}'
```

## 🧪 Testing

### Manual Testing Checklist

1. **Onboarding**
   - Send `/start` to @DonutDot_bot
   - Complete name, age, location
   - Verify profile created

2. **Browse**
   - Send `/browse`
   - Test Like, Pass, Report buttons
   - Verify next profile loads

3. **Matching**
   - Create two test accounts
   - Have them like each other
   - Verify match notification

4. **Daily Pass**
   - Send `/pass`
   - Complete payment (use Razorpay test mode)
   - Verify pass created and notification sent

5. **Chat Session**
   - With active pass, create a match
   - Verify timed chat starts
   - Check expiry notification

### Test Razorpay Webhook Locally

```bash
# Simulate payment webhook
curl -X POST "http://localhost:3000/api/razorpay-webhook" \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: test_signature" \
  -d '{
    "event": "payment_link.paid",
    "payload": {
      "payment_link": {
        "entity": {
          "reference_id": "telegram:123456789:1699999999999"
        }
      }
    }
  }'
```

**Note:** Signature verification will fail locally unless you disable it for testing.

### Unit Tests

```bash
npm test
```

## ⏰ Chat Session Expiry

Chat sessions have `expires_at` timestamp. To enforce expiry and notify users:

### Option 1: Supabase Scheduled Function (Recommended)

Create a Supabase Edge Function that runs every minute:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule function to check expired sessions
SELECT cron.schedule(
  'expire-chat-sessions',
  '* * * * *', -- Every minute
  $$
  SELECT send_expiry_notifications();
  $$
);
```

### Option 2: Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/expire-sessions",
    "schedule": "* * * * *"
  }]
}
```

Create `/api/expire-sessions.js`:

```javascript
export default async function handler(req, res) {
  // Query expired sessions
  // Send notifications
  // Mark as notified
  return res.status(200).json({ ok: true });
}
```

### Option 3: Background Worker

Use a separate Node.js process or service (Render, Railway, etc.) that polls the database.

## 📧 Email Verification Setup

Currently stubbed. To enable:

1. Choose email provider (SendGrid, Mailgun, AWS SES)
2. Add API key to `.env` as `EMAIL_API_KEY`
3. Uncomment email sending code in `api/verify-email.js`
4. Install provider SDK:

```bash
# SendGrid
npm install @sendgrid/mail

# Mailgun
npm install mailgun.js form-data
```

## 🔒 Security Best Practices

- ✅ Razorpay webhook signature verification
- ✅ Admin endpoints protected by secret
- ✅ No secrets in code (environment variables only)
- ✅ Rate limiting (in-memory, upgrade to Redis for production)
- ⚠️ TODO: Add content filtering for bio/messages
- ⚠️ TODO: Add CAPTCHA for signup
- ⚠️ TODO: Implement abuse detection (too many reports)

## 📈 Scaling Recommendations

### Current Limitations

- **In-memory state** (onboarding, rate limits) - doesn't work across serverless instances
- **No caching** - every request queries database
- **Simple matching** - no ML or ranking algorithm

### Scaling Solutions

1. **Redis (Upstash)**
   - Move onboarding state to Redis
   - Implement distributed rate limiting
   - Cache user profiles and match candidates
   - Store session data

```bash
npm install @upstash/redis
```

2. **Message Queue**
   - Use Vercel Queue or external service (AWS SQS, Cloudflare Queues)
   - Process matches asynchronously
   - Send notifications in background
   - Handle email verification

3. **ML-Based Matching**
   - Train model on user preferences and successful matches
   - Pre-compute match scores
   - Store ranked candidates in Redis

4. **Database Optimization**
   - Add materialized views for popular queries
   - Use Supabase realtime subscriptions
   - Implement read replicas

5. **CDN & Caching**
   - Cache static content
   - Use Vercel Edge Functions for geo-distribution

## 🎭 Truth-or-Dare (TODO)

The T/D feature is partially implemented. To complete:

1. Implement session pairing logic
2. Add message relay endpoint
3. Store T/D transcripts
4. Handle reveal/end actions
5. Add public pool matching

See `api/telegram.js` for stub implementation.

## 🐛 Troubleshooting

### Webhook not working

```bash
# Check webhook status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Delete webhook and retry
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

### Database connection issues

- Verify Supabase URL and key
- Check Supabase project is not paused
- For SQLite, ensure file path is writable

### Razorpay webhook signature mismatch

- Verify `RAZORPAY_WEBHOOK_SECRET` matches dashboard
- Check raw body is used (not parsed JSON)
- Test with Razorpay webhook testing tool

### Payments not creating passes

- Check Razorpay webhook logs in dashboard
- Verify `reference_id` format in payment link
- Check server logs for errors

## 📄 License

MIT

## 🙏 Credits

Built with:
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Razorpay](https://razorpay.com)
- [Supabase](https://supabase.com)
- [Vercel](https://vercel.com)

---

**Need help?** Open an issue or reach out to the maintainers.

**Want to contribute?** PRs welcome! Please add tests for new features.
