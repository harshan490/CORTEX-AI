# CORTEX AI Setup Script for Windows
Write-Host "CORTEX AI - Setup Script" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Check prerequisites
$hasNode = Get-Command node -ErrorAction SilentlyContinue
$hasPython = Get-Command python -ErrorAction SilentlyContinue
$hasDocker = Get-Command docker -ErrorAction SilentlyContinue

if (-not $hasNode) {
    Write-Host "Node.js is required. Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

if (-not $hasPython) {
    Write-Host "Python 3.12+ is required. Download from: https://python.org/" -ForegroundColor Yellow
    exit 1
}

# Setup backend
Write-Host "`n[1/3] Setting up backend..." -ForegroundColor Green
Push-Location backend
Copy-Item .env.example .env -ErrorAction SilentlyContinue
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
Pop-Location

# Setup frontend
Write-Host "`n[2/3] Setting up frontend..." -ForegroundColor Green
Push-Location frontend
Copy-Item .env.example .env.local -ErrorAction SilentlyContinue
npm install
Pop-Location

# Setup complete
Write-Host "`n[3/3] Setup complete!" -ForegroundColor Green
Write-Host "`nTo run CORTEX AI:" -ForegroundColor Cyan
Write-Host "  1. Start backend: cd backend; .\venv\Scripts\python -m uvicorn main:app --reload" -ForegroundColor White
Write-Host "  2. Start frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host "  3. Open: http://localhost:3000" -ForegroundColor White
Write-Host "`nOr with Docker:" -ForegroundColor Cyan
Write-Host "  docker-compose -f docker/docker-compose.yml up" -ForegroundColor White
