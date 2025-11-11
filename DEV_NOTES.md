# Development Notes - DonutDot Bot (@DonutDot_bot)

## Environment Setup

### Local Development
```bash
# Install dependencies
npm install

# Initialize SQLite database
npm run init-db

# Start local dev server
npm run dev

# Run tests
npm test
```

### Testing with ngrok
```bash
# Start ngrok
ngrok http 3000

# Set webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-id.ngrok.io/api/telegram"}'
```

## Database Queries

### Check active passes
```sql
SELECT * FROM passes 
WHERE used_at IS NULL 
AND expires_at > CURRENT_TIMESTAMP;
```

### Check matches
```sql
SELECT 
  m.*,
  u1.name as user1_name,
  u2.name as user2_name
FROM matches m
JOIN users u1 ON m.user1_tg_id = u1.tg_id
JOIN users u2 ON m.user2_tg_id = u2.tg_id
ORDER BY m.created_at DESC;
```

### Check pending reports
```sql
SELECT 
  r.*,
  u1.name as reporter_name,
  u2.name as reported_name
FROM reports r
JOIN users u1 ON r.reporter_tg_id = u1.tg_id
JOIN users u2 ON r.reported_tg_id = u2.tg_id
WHERE r.status = 'pending';
```

## TODO List

### High Priority
- [ ] Implement email verification with actual email provider
- [ ] Add content filtering for bio/messages
- [ ] Implement rate limiting with Redis
- [ ] Add user blocking feature
- [ ] Complete Truth-or-Dare feature

### Medium Priority
- [ ] Add profile pictures (optional upload)
- [ ] Implement preference filters UI
- [ ] Add more matching criteria (interests, etc.)
- [ ] Create admin dashboard UI
- [ ] Add analytics/metrics

### Low Priority
- [ ] Add multiple languages support
- [ ] Implement icebreaker questions
- [ ] Add group chat features
- [ ] Create referral program
- [ ] Add subscription model

## Known Issues

1. **In-memory state** - Doesn't work across serverless instances
   - Solution: Migrate to Redis (Upstash)

2. **No background jobs** - Expired sessions not auto-closed
   - Solution: Set up Vercel Cron or Supabase scheduled functions

3. **Simple matching** - No intelligent ranking
   - Solution: Implement ML-based scoring

4. **No content moderation** - Bio/messages not filtered
   - Solution: Integrate Perspective API or similar

## Performance Considerations

### Database Indexes
All critical queries have indexes. Monitor slow queries with:
```sql
-- PostgreSQL
EXPLAIN ANALYZE SELECT ...;

-- SQLite
EXPLAIN QUERY PLAN SELECT ...;
```

### Caching Strategy
Consider caching:
- User profiles (5 min TTL)
- Match candidates (1 min TTL)
- Active passes (check on each use)

### Rate Limiting
Current in-memory implementation:
- 1 action per 3 seconds per user
- Upgrade to Redis for distributed limiting

## Security Checklist

- [x] Webhook signature verification
- [x] Admin endpoint protection
- [x] No secrets in code
- [x] Input validation
- [ ] Content filtering
- [ ] CAPTCHA on signup
- [ ] Abuse detection
- [ ] IP rate limiting

## Deployment Checklist

- [ ] Set all environment variables in Vercel
- [ ] Configure Razorpay webhook
- [ ] Set Telegram webhook URL
- [ ] Test payment flow end-to-end
- [ ] Set up monitoring/alerting
- [ ] Configure domain (optional)
- [ ] Enable Vercel analytics
- [ ] Set up error tracking (Sentry)

## Useful Commands

### Telegram Bot API
```bash
# Get bot info
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# Get webhook info
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Delete webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"

# Send test message
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":123456789,"text":"Test message"}'
```

### Razorpay API
```bash
# Test authentication
curl -u <KEY_ID>:<KEY_SECRET> https://api.razorpay.com/v1/payments

# Create payment link (test)
curl -X POST https://api.razorpay.com/v1/payment_links \
  -u <KEY_ID>:<KEY_SECRET> \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 3000,
    "currency": "INR",
    "description": "Test payment",
    "reference_id": "telegram:123:456"
  }'
```

## Monitoring

Key metrics to track:
- New user signups per day
- Active users (DAU/MAU)
- Match rate (matches per user)
- Pass purchase conversion
- Revenue per user
- Avg session duration
- Churn rate

## Support

For issues or questions:
1. Check README.md
2. Review this dev notes file
3. Check Telegram Bot API docs
4. Check Razorpay docs
5. Open GitHub issue
