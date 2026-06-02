const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Use service_role key from env or the anon key
const supabaseUrl = 'YOUR_SUPABASE_URL';
const anonKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, anonKey);

const sql = fs.readFileSync('E:\\TharaApp\\scripts\\ensure_staff_auth_user.sql', 'utf8');

async function main() {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('RPC error:', error);
    // Try REST API directly
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({ query: sql })
      }
    );
    const text = await res.text();
    console.log('Direct REST response:', res.status, text);
  } else {
    console.log('Success:', data);
  }
}

main().catch(console.error);
