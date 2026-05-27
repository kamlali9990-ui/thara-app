# Setup script for new machine
Write-Host "=== TharaApp Setup ===" -ForegroundColor Green
Write-Host ""

# 1. Install Node dependencies
Write-Host "[1/3] Installing npm packages..." -ForegroundColor Cyan
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed" -ForegroundColor Red; exit 1 }

# 2. Copy .env file
Write-Host "[2/3] Setting up .env..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "  Created .env from .env.example - verify values are correct" -ForegroundColor Yellow
} else {
  Write-Host "  .env already exists" -ForegroundColor Green
}

# 3. Supabase login + link
Write-Host "[3/3] Supabase setup..." -ForegroundColor Cyan
Write-Host "  Run these commands manually (needs your PAT):" -ForegroundColor Yellow
Write-Host "    set SUPABASE_ACCESS_TOKEN=sbp_your_token_here" -ForegroundColor White
Write-Host "    npm run supabase:login" -ForegroundColor White
Write-Host "    npm run supabase:link" -ForegroundColor White
Write-Host ""

Write-Host "=== Done! Run 'npm run dev' to start ===" -ForegroundColor Green
