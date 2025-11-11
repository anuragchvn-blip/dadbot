#!/usr/bin/env node

/**
 * Setup verification script for DonutDot Bot
 * Checks that all required dependencies and configuration are present
 */

import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 DonutDot Bot - Setup Verification\n');

let hasErrors = false;
let hasWarnings = false;

// Check Node.js version
console.log('✓ Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion < 18) {
  console.error(`  ❌ Node.js ${nodeVersion} detected. Requires Node.js 18+`);
  hasErrors = true;
} else {
  console.log(`  ✅ Node.js ${nodeVersion}`);
}

// Check package.json
console.log('\n✓ Checking package.json...');
try {
  const packagePath = join(__dirname, 'package.json');
  if (existsSync(packagePath)) {
    console.log('  ✅ package.json exists');
  } else {
    console.error('  ❌ package.json not found');
    hasErrors = true;
  }
} catch (err) {
  console.error(`  ❌ Error reading package.json: ${err.message}`);
  hasErrors = true;
}

// Check node_modules
console.log('\n✓ Checking dependencies...');
const nodeModulesPath = join(__dirname, 'node_modules');
if (existsSync(nodeModulesPath)) {
  console.log('  ✅ node_modules directory exists');
  
  // Check core dependencies
  const coreDeps = [
    '@supabase/supabase-js',
    'dotenv'
  ];
  
  for (const dep of coreDeps) {
    const depPath = join(nodeModulesPath, dep);
    if (existsSync(depPath)) {
      console.log(`  ✅ ${dep} installed`);
    } else {
      console.error(`  ❌ ${dep} not installed`);
      hasErrors = true;
    }
  }
  
  // Check optional dependency
  const sqlitePath = join(nodeModulesPath, 'better-sqlite3');
  if (existsSync(sqlitePath)) {
    console.log('  ✅ better-sqlite3 installed (SQLite support enabled)');
  } else {
    console.log('  ⚠️  better-sqlite3 not installed (SQLite support disabled - Supabase required)');
    hasWarnings = true;
  }
} else {
  console.error('  ❌ node_modules not found. Run: npm install');
  hasErrors = true;
}

// Check .env file
console.log('\n✓ Checking environment configuration...');
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  console.log('  ✅ .env file exists');
  
  // Try to load and check critical variables
  try {
    const { config } = await import('dotenv');
    config();
    
    const criticalVars = ['TELEGRAM_TOKEN'];
    const recommendedVars = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'ADMIN_SECRET'];
    const dbVars = ['SUPABASE_URL', 'SUPABASE_KEY'];
    
    // Check critical
    for (const varName of criticalVars) {
      if (process.env[varName]) {
        console.log(`  ✅ ${varName} set`);
      } else {
        console.error(`  ❌ ${varName} not set (required)`);
        hasErrors = true;
      }
    }
    
    // Check database
    const hasSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY;
    const hasSQLite = existsSync(join(nodeModulesPath, 'better-sqlite3'));
    
    if (hasSupabase) {
      console.log('  ✅ SUPABASE_URL and SUPABASE_KEY set');
    } else if (hasSQLite) {
      console.log('  ⚠️  Supabase not configured, will use SQLite (local dev only)');
      hasWarnings = true;
    } else {
      console.error('  ❌ No database configured! Set SUPABASE_URL/KEY or install better-sqlite3');
      hasErrors = true;
    }
    
    // Check recommended
    for (const varName of recommendedVars) {
      if (process.env[varName]) {
        console.log(`  ✅ ${varName} set`);
      } else {
        console.log(`  ⚠️  ${varName} not set (recommended)`);
        hasWarnings = true;
      }
    }
    
  } catch (err) {
    console.error(`  ❌ Error loading .env: ${err.message}`);
    hasErrors = true;
  }
} else {
  console.error('  ❌ .env file not found. Copy .env.example to .env and configure it');
  hasErrors = true;
}

// Check required directories
console.log('\n✓ Checking project structure...');
const requiredDirs = ['api', 'lib', 'migrations', 'scripts'];
for (const dir of requiredDirs) {
  const dirPath = join(__dirname, dir);
  if (existsSync(dirPath)) {
    console.log(`  ✅ ${dir}/ directory exists`);
  } else {
    console.error(`  ❌ ${dir}/ directory missing`);
    hasErrors = true;
  }
}

// Check critical files
console.log('\n✓ Checking critical files...');
const criticalFiles = [
  'api/telegram.js',
  'api/razorpay-webhook.js',
  'lib/db.js',
  'lib/supabaseClient.js',
  'migrations/migrate.sql'
];

for (const file of criticalFiles) {
  const filePath = join(__dirname, file);
  if (existsSync(filePath)) {
    console.log(`  ✅ ${file} exists`);
  } else {
    console.error(`  ❌ ${file} missing`);
    hasErrors = true;
  }
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ Setup has ERRORS. Please fix the issues above.');
  console.log('\nQuick fixes:');
  console.log('  - Run: npm install');
  console.log('  - Copy .env.example to .env');
  console.log('  - Set TELEGRAM_TOKEN and database credentials in .env');
  console.log('  - For Supabase: Set SUPABASE_URL and SUPABASE_KEY');
  console.log('  - For SQLite: Run "npm run install:sqlite" (requires build tools)');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Setup complete with warnings (see above).');
  console.log('\nYour bot should work, but consider:');
  console.log('  - Setting up Supabase for production');
  console.log('  - Configuring Razorpay for payments');
  console.log('  - Setting ADMIN_SECRET for admin endpoints');
  console.log('\nReady to test? Run: npm run dev');
  process.exit(0);
} else {
  console.log('✅ Setup looks good! All checks passed.');
  console.log('\nNext steps:');
  console.log('  1. npm run dev          - Test locally');
  console.log('  2. vercel               - Deploy to production');
  console.log('  3. Set Telegram webhook - See README.md');
  console.log('\nHappy coding! 🍩');
  process.exit(0);
}
