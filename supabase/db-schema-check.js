const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Supabase URL or Key not found in env!');
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  const tables = ['employees', 'commissions', 'documents', 'document_prints'];
  for (const table of tables) {
    console.log(`\n=== Checking Table: ${table} ===`);
    const { error } = await supabase.from(table).insert({});
    if (error) {
      console.log('Error Message:', error.message);
      console.log('Details:', error.details);
      console.log('Hint:', error.hint);
    } else {
      console.log('No error returned.');
    }
  }
}

check();
