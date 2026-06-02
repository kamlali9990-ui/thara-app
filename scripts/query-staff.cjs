const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'YOUR_SUPABASE_URL';
const anonKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('email', 'YOUR_STAFF_EMAIL');

  if (error) {
    console.error('Fetch failed:', error.message);
  } else {
    console.log('QueryResult for staff:', data);
  }
  
  // Also list all staff in the table
  const { data: allStaff, error: err2 } = await supabase
    .from('staff')
    .select('*');
  if (err2) {
    console.error('Fetch all failed:', err2.message);
  } else {
    console.log('All staff members:', allStaff);
  }
}

main().catch(console.error);
