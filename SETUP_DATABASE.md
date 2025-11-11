# Database Setup Guide - DonutDot Bot

## Quick Decision Guide

**For Production (Recommended):** Use Supabase ✅  
**For Local Testing Only:** Use SQLite (requires build tools)

---

## Option 1: Supabase (Recommended for Production)

### Why Supabase?
- ✅ No build tools required
- ✅ Works on any platform (Windows, Mac, Linux)
- ✅ Serverless-friendly (perfect for Vercel)
- ✅ Free tier available (50,000 rows)
- ✅ Built-in auth, storage, and real-time features
- ✅ Easy backups and migrations

### Setup Steps

1. **Create Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up (free)
   - Click "New Project"

2. **Configure Project**
   - Organization: Create new or select existing
   - Name: `donutdot-bot` (or your choice)
   - Database Password: Generate strong password
   - Region: Choose closest to your users
   - Wait 2-3 minutes for provisioning

3. **Run Migration**
   - Go to SQL Editor in Supabase dashboard
   - Copy entire contents of `migrations/migrate.sql`
   - Paste and click "Run"
   - You should see: "Success. No rows returned"
   - Verify: Go to Table Editor, you should see 9 tables

4. **Get Credentials**
   - Go to Settings → API
   - Copy `Project URL`
   - Copy `anon public` key
   - Add to `.env`:
     ```env
     SUPABASE_URL=https://xxxxx.supabase.co
     SUPABASE_KEY=eyJhbGc...your_key_here
     ```

5. **Test Connection**
   ```bash
   npm run dev
   ```
   You should see: `✅ Using Supabase database`

### Supabase Dashboard Tips

- **Table Editor**: View and edit data manually
- **SQL Editor**: Run custom queries
- **Database**: See table schemas, indexes, triggers
- **API Docs**: Auto-generated API documentation
- **Logs**: View query logs and errors

---

## Option 2: SQLite (Local Development Only)

### Why SQLite?
- ⚠️ Local development/testing only
- ⚠️ Requires Python and C++ build tools
- ⚠️ NOT suitable for production
- ✅ Works offline
- ✅ Single file database

### Requirements

**Windows:**
- Python 3.8+ (from [python.org](https://www.python.org/downloads/))
- Visual Studio Build Tools OR
- Windows Build Tools: `npm install -g windows-build-tools` (run as Admin)

**Mac:**
- Xcode Command Line Tools: `xcode-select --install`

**Linux:**
- `sudo apt-get install python3 build-essential` (Debian/Ubuntu)
- `sudo yum install python3 gcc-c++ make` (CentOS/RHEL)

### Setup Steps

1. **Install Build Tools** (see above)

2. **Install SQLite Package**
   ```bash
   npm run install:sqlite
   ```
   This will compile `better-sqlite3` with native bindings.

3. **Initialize Database**
   ```bash
   npm run init-db
   ```
   This creates `local.db` with all tables.

4. **Configure Environment**
   ```env
   # .env file - leave Supabase vars empty to use SQLite
   SQLITE_PATH=./local.db
   ```

5. **Test**
   ```bash
   npm run dev
   ```
   You should see: `✅ Using SQLite database at ./local.db`

### SQLite Limitations

- ⚠️ Single connection (not suitable for concurrent users)
- ⚠️ File-based (lost if container/instance restarts)
- ⚠️ No built-in replication or backups
- ⚠️ Performance degrades with large datasets

---

## Troubleshooting

### "better-sqlite3 installation failed"

**Windows Error: Python not found**
```bash
# Install Python from python.org, then:
npm config set python "C:\Python311\python.exe"
npm run install:sqlite
```

**Mac Error: node-gyp failed**
```bash
xcode-select --install
npm run install:sqlite
```

**Linux Error: Missing compiler**
```bash
sudo apt-get update
sudo apt-get install build-essential python3
npm run install:sqlite
```

**Alternative: Just use Supabase!**
If build tools installation is complicated, just use Supabase. It's easier and better for production anyway.

### "No database configured!"

You'll see this error if:
- Supabase env vars are not set, AND
- better-sqlite3 is not installed

**Solution 1: Use Supabase**
```bash
# Add to .env:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_key_here
```

**Solution 2: Install SQLite**
```bash
npm run install:sqlite
npm run init-db
```

### Supabase connection errors

**Error: "Invalid API key"**
- Check you copied the `anon public` key (not service_role)
- Verify no extra spaces in `.env`

**Error: "fetch failed"**
- Check project URL is correct
- Verify project is not paused (Settings → General)
- Check internet connection

**Error: "relation does not exist"**
- Migration not run yet
- Go to SQL Editor and run `migrations/migrate.sql`

### SQLite file permissions

**Error: "unable to open database file"**
```bash
# Ensure directory is writable
chmod 755 .
npm run init-db
```

---

## Switching Between Databases

You can easily switch between Supabase and SQLite:

**To use Supabase:**
```env
# .env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_key_here
# SQLITE_PATH is ignored when Supabase vars are set
```

**To use SQLite:**
```env
# .env
# Comment out or remove Supabase vars
# SUPABASE_URL=
# SUPABASE_KEY=
SQLITE_PATH=./local.db
```

The app automatically detects which to use based on environment variables.

---

## Migration Guide

### From SQLite to Supabase

1. Set up Supabase (see Option 1 above)
2. Export SQLite data:
   ```bash
   sqlite3 local.db .dump > backup.sql
   ```
3. Convert to PostgreSQL format (if needed)
4. Import via Supabase SQL Editor
5. Update `.env` with Supabase credentials
6. Test thoroughly

### Backup Strategies

**Supabase:**
- Automatic daily backups (paid plans)
- Manual: Database → Backups
- Export: SQL Editor → Run `.dump` equivalent query

**SQLite:**
- Copy `local.db` file periodically
- Use `sqlite3 local.db .backup backup.db`
- Version control (NOT recommended for production data)

---

## Production Checklist

Before deploying to production:

- [ ] Using Supabase (NOT SQLite)
- [ ] Database credentials in Vercel environment variables
- [ ] Migration script run successfully
- [ ] All 9 tables visible in Supabase
- [ ] Indexes created (automatically via migration)
- [ ] Connection pooling enabled (default in Supabase)
- [ ] Backup strategy in place
- [ ] Monitoring/alerts configured

---

## Common Questions

**Q: Can I use both Supabase and SQLite?**  
A: Yes, but not simultaneously. Set env vars to choose which to use.

**Q: Should I commit local.db to git?**  
A: NO. It's in `.gitignore` for a reason. Use migrations instead.

**Q: Can SQLite handle 1000+ users?**  
A: Not recommended. Switch to Supabase for scale.

**Q: Is my data safe in Supabase free tier?**  
A: Yes, but projects pause after 1 week inactivity. Upgrade to keep active.

**Q: Can I use PostgreSQL directly (not Supabase)?**  
A: Yes, just set `SUPABASE_URL` to your Postgres connection URL and `SUPABASE_KEY` can be empty (modify client code to handle direct Postgres).

**Q: What about MySQL/MongoDB?**  
A: Not currently supported. PRs welcome!

---

## Next Steps

Once your database is set up:

1. ✅ Test bot locally: `npm run dev`
2. ✅ Deploy to Vercel: `vercel`
3. ✅ Set environment variables in Vercel dashboard
4. ✅ Set Telegram webhook
5. ✅ Test end-to-end

Need help? Check [README.md](README.md) or [DEV_NOTES.md](DEV_NOTES.md)
