# Fantasy Team Manager — one-time Laravel bootstrap (requires Docker)
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "1/3 Creating Laravel in .\backend (if missing)..." -ForegroundColor Cyan
docker compose --profile init run --rm composer-init

if (-not (Test-Path "backend\artisan")) {
  Write-Host "No backend\artisan — install Docker Desktop and retry." -ForegroundColor Red
  exit 1
}

Write-Host "2/3 Set Postgres in backend\.env (copy from .env.postgres.example)" -ForegroundColor Yellow
Write-Host "3/3 Starting stack..." -ForegroundColor Cyan
docker compose build backend
docker compose up -d
Write-Host "API http://localhost:8000 | cd frontend; npm run dev" -ForegroundColor Green
