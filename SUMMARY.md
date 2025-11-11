# 🎯 DonutDot Bot (@DonutDot_bot) - Complete Project Summary

## Repository Structure

```
dadbot/
├── 📁 api/                    # Vercel serverless functions
│   ├── telegram.js            # Main bot webhook (commands, browse, match)
│   ├── razorpay-webhook.js    # Payment webhook handler
│   ├── verify-email.js        # Email verification endpoint
│   ├── admin.js               # Admin moderation endpoints
│   ├── payment-callback.js    # Post-payment redirect page
│   └── expire-sessions.js     # Cron job for session expiry
│
├── 📁 lib/                    # Core business logic
│   ├── supabaseClient.js      # DB client (Supabase/SQLite)
│   ├── db.js                  # High-level DB functions
│   ├── matcher.js             # Matching algorithm
│   ├── telegram.js            # Telegram API wrappers
│   └── razorpay.js            # Payment helpers
│
├── 📁 migrations/             # Database schema
│   └── migrate.sql            # SQL schema for Postgres/SQLite
│
├── 📁 scripts/                # Utility scripts
│   └── init_db.js             # SQLite initialization
│
├── 📁 tests/                  # Unit tests
│   └── matcher.test.js        # Matcher tests
│
├── 📄 Configuration Files
│   ├── package.json           # Dependencies & scripts
│   ├── vercel.json            # Vercel deployment config
│   ├── jest.config.json       # Test configuration
│   ├── .env.example           # Environment variables template
│   └── .gitignore             # Git ignore rules
│
└── 📄 Documentation
    ├── README.md              # Main documentation
    ├── DEV_NOTES.md           # Development notes
    └── SUMMARY.md             # This file
```

## Key Features Implemented

### ✅ User Management
- Text-only profiles (name, age, location, bio, university)
- Onboarding flow via conversation
- Profile editing
- Email verification (stub - needs email provider)
- Verified badge for university emails

### ✅ Matching System
- Browse profiles with Like/Pass/Report
- Mutual like = Match
- Preference filters (age, location, university-only)
- Simple scoring algorithm (extensible to ML)

### ✅ Monetization (Daily Pass)
- ₹30 payment via Razorpay Payment Links
- One pass = one 2-minute timed chat
- Pass validity: 24 hours (configurable)
- Automatic consumption on chat start
- Webhook verification with HMAC SHA256

### ✅ Chat Sessions
- Timed 2-minute chats after match
- Consumes active pass
- Stores session metadata
- Expiry notifications (via cron)

### ✅ Moderation
- Report system
- Admin endpoints (ban/unban/grant pass)
- Protected by admin secret

### 🚧 Partial Implementation
- **Truth-or-Dare**: Database schema ready, relay logic stubbed
- **Email verification**: Endpoint ready, needs email provider integration

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js 18+ | Server-side JavaScript |
| **Framework** | Vercel Serverless | Serverless HTTP endpoints |
| **Database** | Supabase (Postgres) | Primary database |
| **Fallback DB** | SQLite (better-sqlite3) | Local development |
| **Payments** | Razorpay | Payment processing |
| **Bot Platform** | Telegram Bot API | User interface |
| **Testing** | Jest | Unit tests |

## Environment Variables Reference

```env
# Core Services
TELEGRAM_TOKEN          # From @BotFather
SUPABASE_URL           # Supabase project URL
SUPABASE_KEY           # Supabase anon key
RAZORPAY_KEY_ID        # Razorpay API key
RAZORPAY_KEY_SECRET    # Razorpay secret
RAZORPAY_WEBHOOK_SECRET # Razorpay webhook secret

# Security
ADMIN_SECRET           # Admin endpoint protection

# Configuration
VERCEL_URL             # Deployment URL
DAILY_PASS_AMOUNT_PAISA # Default: 3000 (₹30)
PASS_DURATION_SECONDS   # Default: 120 (2 min)
PASS_VALIDITY_HOURS     # Default: 24

# Optional
SQLITE_PATH            # SQLite DB path (local dev)
EMAIL_API_KEY          # SendGrid/Mailgun key
EMAIL_FROM             # Sender email
CRON_SECRET            # Protect cron endpoints
```

## Database Schema Overview

### Core Tables
- **users** - User profiles
- **likes** - User likes (for matching)
- **matches** - Mutual matches
- **passes** - Daily pass purchases
- **chat_sessions** - Timed chat records

### Supporting Tables
- **td_sessions** - Truth-or-Dare sessions
- **td_messages** - T/D message history
- **reports** - User reports
- **verification_tokens** - Email verification

## API Endpoints

### Public Endpoints
- `POST /api/telegram` - Telegram webhook
- `POST /api/razorpay-webhook` - Payment webhook
- `GET /api/verify-email?token=xxx` - Email verification
- `GET /api/payment-callback` - Post-payment redirect

### Admin Endpoints (require X-Admin-Secret)
- `GET /api/admin?action=reports` - List reports
- `POST /api/admin?action=ban` - Ban user
- `POST /api/admin?action=unban` - Unban user
- `POST /api/admin?action=mark_verified` - Verify user
- `POST /api/admin?action=grant_pass` - Grant free pass

### Cron Endpoints
- `GET /api/expire-sessions` - Check expired sessions

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Create profile or welcome back |
| `/profile` | View/edit profile |
| `/browse` | Browse and like profiles |
| `/matches` | View mutual matches |
| `/pass` | Buy Daily Pass (₹30) |
| `/verify_email` | Start email verification |
| `/help` | Show help message |

## User Flow Diagrams

### Onboarding Flow
```
/start → Name? → Age? → Location? → Profile Created
                                   ↓
                            Can add bio/university
                            via /profile
```

### Matching Flow
```
/browse → See Profile → Like
                        ↓
              Other user likes back
                        ↓
                  MATCH! 💕
                        ↓
           Check if either has pass
           ↙               ↘
     Has pass            No pass
         ↓                  ↓
  Start timed chat    Notify both to buy pass
  (consume pass)
         ↓
   Chat expires after 2 min
```

### Payment Flow
```
/pass → Create Payment Link → User pays
          ↓                      ↓
   Return short_url    Razorpay webhook
          ↓                      ↓
   User clicks         Verify signature
          ↓                      ↓
   Pay on Razorpay     Parse telegram:<id>:<ts>
          ↓                      ↓
   Redirect to       Create pass record
   payment-callback            ↓
                        Notify user via bot
```

## Deployment Steps

1. **Prepare Environment**
   ```bash
   git clone <repo>
   npm install
   cp .env.example .env
   # Fill in .env values
   ```

2. **Setup Supabase**
   - Create project at supabase.com
   - Run `migrations/migrate.sql`
   - Copy URL and key to .env

3. **Deploy to Vercel**
   ```bash
   vercel login
   vercel
   # Set env vars in dashboard
   ```

4. **Configure Telegram**
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d '{"url":"https://your-app.vercel.app/api/telegram"}'
   ```

5. **Configure Razorpay**
   - Go to dashboard.razorpay.com
   - Add webhook: `https://your-app.vercel.app/api/razorpay-webhook`
   - Select events: payment_link.paid, payment.captured
   - Copy secret to .env

6. **Test End-to-End**
   - Message bot on Telegram
   - Complete onboarding
   - Browse profiles
   - Buy pass (test mode)
   - Create match and start chat

## Future Enhancements

### High Priority
- [ ] Complete Truth-or-Dare feature
- [ ] Integrate email provider (SendGrid/Mailgun)
- [ ] Add Redis for state management (Upstash)
- [ ] Implement content filtering
- [ ] Set up monitoring (Sentry, analytics)

### Medium Priority
- [ ] ML-based matching algorithm
- [ ] Admin dashboard UI
- [ ] User blocking feature
- [ ] More preference filters
- [ ] Analytics/metrics tracking

### Low Priority
- [ ] Profile photos (optional)
- [ ] Multi-language support
- [ ] Icebreaker questions
- [ ] Referral program
- [ ] Group chats

## Testing Checklist

- [ ] Local dev with ngrok
- [ ] Onboarding flow
- [ ] Browse and like
- [ ] Match creation
- [ ] Payment flow (test mode)
- [ ] Pass consumption
- [ ] Chat session
- [ ] Report user
- [ ] Admin endpoints
- [ ] Email verification
- [ ] Session expiry

## Performance Optimization

### Current Bottlenecks
1. In-memory state (doesn't scale across instances)
2. No caching (every request hits DB)
3. Simple matching (no pre-computation)

### Recommended Optimizations
1. **Add Redis (Upstash)**
   - Cache user profiles
   - Store onboarding state
   - Implement distributed rate limiting

2. **Pre-compute matches**
   - Background job to score candidates
   - Store in Redis with TTL
   - Use for browse endpoint

3. **Add CDN**
   - Cache static responses
   - Use Vercel Edge Functions

4. **Database indexes**
   - Already implemented on critical columns
   - Monitor with EXPLAIN queries

## Security Considerations

### Implemented
- ✅ Webhook signature verification
- ✅ Admin secret protection
- ✅ Environment variables for secrets
- ✅ Input validation
- ✅ Rate limiting (basic)

### TODO
- ⚠️ Content filtering (profanity, spam)
- ⚠️ CAPTCHA on signup
- ⚠️ Abuse detection
- ⚠️ IP-based rate limiting
- ⚠️ Session management improvements

## Support & Contribution

**Documentation**
- Main guide: `README.md`
- Dev notes: `DEV_NOTES.md`
- This summary: `SUMMARY.md`

**Getting Help**
1. Check documentation
2. Review Telegram/Razorpay docs
3. Check DEV_NOTES.md
4. Open GitHub issue

**Contributing**
- Fork repository
- Create feature branch
- Add tests for new features
- Submit PR with description

## License

MIT - See LICENSE file

---

**Project Status**: ✅ Ready for deployment with basic features
**Last Updated**: 2025-11-11
**Version**: 1.0.0
