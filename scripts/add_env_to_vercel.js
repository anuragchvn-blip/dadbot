#!/usr/bin/env node

/**
 * Script to add environment variables to Vercel
 */

import { execSync } from 'child_process';

const envVars = {
  TELEGRAM_TOKEN: '8198416791:AAGi4EELXF-YGqCQMG3qGkliY9LdgnjFxYQ',
  SUPABASE_URL: 'https://whmtfsoldzkguvgoglqa.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobXRmc29sZHprZ3V2Z29nbHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMzAsImV4cCI6MjA3ODQ1MDAzMH0.YXmaihF3CbTNDbA3630-AutQOhgvFBiNwPmGxHsbZ1g',
  RAZORPAY_KEY_ID: 'rzp_live_ROehA1ETKHYAcZ',
  RAZORPAY_KEY_SECRET: 'iSj7q1WCpYqeVYDQ7a9Et4eW',
  RAZORPAY_WEBHOOK_SECRET: 'Chvn@2003',
  ADMIN_SECRET: 'admin_anuragchvn',
  VERCEL_URL: 'https://dadbot-nine.vercel.app',
  DAILY_PASS_AMOUNT_PAISA: '3000',
  PASS_DURATION_SECONDS: '120',
  PASS_VALIDITY_HOURS: '24',
  NODE_ENV: 'production'
};

console.log('📝 Adding environment variables to Vercel...\n');

for (const [key, value] of Object.entries(envVars)) {
  try {
    console.log(`Adding ${key}...`);
    const cmd = `vercel env add ${key} production`;
    execSync(cmd, {
      input: `${value}\n`,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`✅ ${key} added\n`);
  } catch (error) {
    console.log(`⚠️  ${key} might already exist or error occurred\n`);
  }
}

console.log('✅ All environment variables processed!');
console.log('\nNext: Run "vercel --prod" to redeploy with new environment variables');
