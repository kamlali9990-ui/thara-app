const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'YOUR_SUPABASE_URL';
const anonKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  // Login as admin
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'YOUR_ADMIN_EMAIL',
    password: 'YOUR_ADMIN_PASSWORD'
  });

  if (loginError) {
    console.error('Login failed:', loginError.message);
    return;
  }

  console.log('Logged in as:', loginData.user?.email);

  // Fetch staff list
  const { data: staffData, error: staffError } = await supabase.rpc('list_staff_rpc', {});

  if (staffError) {
    console.error('Failed to fetch staff:', staffError.message, staffError.details, staffError.hint);
    return;
  }

  const staff = typeof staffData === 'string' ? JSON.parse(staffData) : staffData;
  console.log('\n=== Staff Accounts (' + staff.length + ') ===');
  staff.forEach(s => {
    console.log(`  ${s.id}. ${s.name} - ${s.email} (${s.role})`);
  });

  // Fetch auth users via the admin API
  // We can try using the service_role key from an RPC
  console.log('\n=== Auth Users ===');
  const { data: usersData, error: usersError } = await supabase.rpc('list_auth_users_rpc');
  if (usersError) {
    console.log('Cannot list auth users directly (need custom RPC)');
  } else {
    console.log(usersData);
  }

  await supabase.auth.signOut();
}

main().catch(console.error);
