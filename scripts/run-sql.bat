@echo off
set SUPABASE_ACCESS_TOKEN=YOUR_SUPABASE_ACCESS_TOKEN
npx supabase db query --project-ref YOUR_PROJECT_REF %*
