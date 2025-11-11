/**
 * Simple verification script to test core functionality
 * Run with: node scripts/test_setup.js
 */

import 'dotenv/config';

const requiredEnvVars = [
  'TELEGRAM_TOKEN',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'ADMIN_SECRET'
];

const optionalEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'SQLITE_PATH',
  'VERCEL_URL',
  'RAZORPAY_WEBHOOK_SECRET'
];

console.log('🔍 DonutDot Bot (@DonutDot_bot) - Setup Verification\n');

// Check required environment variables
let missingVars = [];
console.log('✓ Checking required environment variables...');
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.log(`  ❌ Missing: ${varName}`);
    missingVars.push(varName);
  } else {
    console.log(`  ✅ ${varName} is set`);
  }
}

console.log('\n✓ Checking optional environment variables...');
for (const varName of optionalEnvVars) {
  if (!process.env[varName]) {
    console.log(`  ⚠️  Not set: ${varName}`);
  } else {
    console.log(`  ✅ ${varName} is set`);
  }
}

if (missingVars.length > 0) {
  console.log('\n❌ Setup incomplete. Please set missing environment variables in .env file');
  process.exit(1);
}

// Check database connection
console.log('\n✓ Checking database connection...');
try {
  const { useSupabase } = await import('../lib/supabaseClient.js');
  if (useSupabase) {
    console.log('  ✅ Using Supabase (Postgres)');
  } else {
    console.log('  ✅ Using SQLite (local)');
  }
} catch (error) {
  console.log('  ❌ Database connection failed:', error.message);
  process.exit(1);
}

// Test Telegram Bot API
console.log('\n✓ Testing Telegram Bot API...');
try {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/getMe`);
  const data = await response.json();
  
  if (data.ok) {
    console.log(`  ✅ Bot connected: @${data.result.username}`);
    console.log(`     Name: ${data.result.first_name}`);
  } else {
    console.log('  ❌ Telegram API error:', data.description);
    process.exit(1);
  }
} catch (error) {
  console.log('  ❌ Failed to connect to Telegram:', error.message);
  process.exit(1);
}

// Check webhook status
console.log('\n✓ Checking webhook status...');
try {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/getWebhookInfo`);
  const data = await response.json();
  
  if (data.ok) {
    if (data.result.url) {
      console.log(`  ✅ Webhook is set: ${data.result.url}`);
      if (data.result.pending_update_count > 0) {
        console.log(`  ⚠️  Pending updates: ${data.result.pending_update_count}`);
        console.log('     This may indicate webhook is not responding correctly');
      }
    } else {
      console.log('  ⚠️  Webhook not set. Run this command after deploying:');
      console.log(`     curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \\`);
      console.log(`       -d "url=https://your-app.vercel.app/api/telegram"`);
    }
  }
} catch (error) {
  console.log('  ⚠️  Could not check webhook status:', error.message);
}

// Test Razorpay credentials
console.log('\n✓ Testing Razorpay credentials...');
try {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/payments?count=1', {
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });
  
  if (response.ok) {
    console.log('  ✅ Razorpay credentials valid');
    const data = await response.json();
    console.log(`     API version: ${response.headers.get('x-razorpay-version') || 'unknown'}`);
  } else {
    console.log('  ❌ Razorpay authentication failed');
    console.log('     Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
  }
} catch (error) {
  console.log('  ⚠️  Could not test Razorpay:', error.message);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ Setup verification complete!\n');

console.log('Next steps:');
console.log('1. Deploy to Vercel: vercel --prod');
console.log('2. Set webhook: curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook"');
console.log('3. Configure Razorpay webhook in dashboard');
console.log('4. Test bot by messaging it on Telegram');
console.log('\nFor detailed instructions, see QUICKSTART.md');
console.log('='.repeat(60));
