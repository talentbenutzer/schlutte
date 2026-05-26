const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '../.env.local');
let envContent = '';
try { envContent = fs.readFileSync(envPath, 'utf8'); } catch (e) { process.exit(1); }

const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) { env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, ''); }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const email = `test_dev_${Math.random().toString(36).slice(2, 7)}@grabner.design`;
  const password = 'Password123!';
  
  console.log('Signing up temporary user:', email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password
  });

  if (signUpError) {
    console.error('Sign up failed:', signUpError.message);
    return;
  }

  console.log('Sign up successful! Token details:', !!signUpData.session);
  const session = signUpData.session;
  if (!session) {
    console.log('Email confirmation might be required. Attempting login just in case...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (signInError) {
      console.error('Sign in failed:', signInError.message);
      return;
    }
    console.log('Sign in successful!');
  }

  // Now that we are authenticated, let's try to query the REST spec or test inserts
  console.log('Authenticated! Testing insert on commissions...');
  const { data, error } = await supabase.from('commissions').insert({
    commission_number: '999999',
    customer_name: 'Test Client',
    project_name: 'Test Project',
    notes: 'Test Notes'
  }).select();

  if (error) {
    console.error('Insert failed:', error.message, error.details);
  } else {
    console.log('Insert succeeded! Row returned:', data);
  }
}

run();
