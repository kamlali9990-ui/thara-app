$env:SUPABASE_ACCESS_TOKEN = 'YOUR_SUPABASE_ACCESS_TOKEN'
$sql = Get-Content -Raw 'E:\TharaApp\scripts\ensure_staff_auth_user.sql'
npx supabase db query --project-ref YOUR_PROJECT_REF $sql
