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

async function testColumns() {
  const tests = [
    {
      table: 'commissions',
      select: 'id,commission_number,customer_name,project_name,notes,created_by_initials,created_at,updated_at'
    },
    {
      table: 'documents',
      select: 'id,commission_id,document_type,title,form_data,created_by_initials,created_at,updated_at'
    },
    {
      table: 'document_prints',
      select: 'id,document_id,print_label,pdf_url,created_by_initials,created_at'
    },
    {
      table: 'employees',
      select: 'id,initials,name,is_admin,is_active,created_at'
    }
  ];

  for (const t of tests) {
    const { error } = await supabase.from(t.table).select(t.select).limit(1);
    if (error) {
      console.log(`❌ select(${t.select}) from ${t.table} failed:`, error.message);
    } else {
      console.log(`✅ select(${t.select}) from ${t.table} SUCCEEDED!`);
    }
  }
}

testColumns();
