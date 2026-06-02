const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'YOUR_SUPABASE_URL';
const anonKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  const query = `
    INSERT INTO public.staff (email, name, role)
    VALUES ('YOUR_ADMIN_EMAIL', 'YOUR_ADMIN_NAME', 'admin')
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;
  `;

  console.log('Attempting to call exec_sql RPC...');
  const { data, error } = await supabase.rpc('exec_sql', { query });
  
  if (error) {
    console.error('exec_sql RPC failed:', error.message, error.details);
    
    // Let's also try calling confirm_auth_user to see if it's accessible
    console.log('Attempting to call confirm_auth_user RPC as anon...');
    const { data: d2, error: e2 } = await supabase.rpc('confirm_auth_user', {
      p_email: 'YOUR_ADMIN_EMAIL',
      p_password: 'YOUR_ADMIN_PASSWORD'
    });
    if (e2) {
      console.error('confirm_auth_user failed:', e2.message);
    } else {
      console.log('confirm_auth_user success:', d2);
    }
  } else {
    console.log('exec_sql RPC success! Added admin:', data);
  }
}

main().catch(console.error);
