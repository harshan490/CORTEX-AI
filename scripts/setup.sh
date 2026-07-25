#!/usr/bin/env bash
set -euo pipefail

# CORTEX AI Setup Script for Linux/macOS

echo -e "\033[36mCORTEX AI - Setup Script\033[0m"
echo -e "\033[36m=========================\033[0m"

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo -e "\033[33mNode.js is required. Download from: https://nodejs.org/\033[0m"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "\033[33mPython 3.12+ is required. Download from: https://python.org/\033[0m"
    exit 1
fi

# Setup backend
echo -e "\n\033[32m[1/3] Setting up backend...\033[0m"
cd backend
cp -n .env.example .env 2>/dev/null || true
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Setup frontend
echo -e "\n\033[32m[2/3] Setting up frontend...\033[0m"
cd frontend
cp -n .env.example .env.local 2>/dev/null || true
npm install
cd ..

# Setup complete
echo -e "\n\033[32m[3/3] Setup complete!\033[0m"
echo -e "\n\033[36mTo run CORTEX AI:\033[0m"
echo -e "  1. Start backend:  \033[37mcd backend && source venv/bin/activate && uvicorn main:app --reload\033[0m"
echo -e "  2. Start frontend: \033[37mcd frontend && npm run dev\033[0m"
echo -e "  3. Open:          \033[37mhttp://localhost:3000\033[0m"
echo -e "\n\033[36mOr with Docker:\033[0m"
echo -e "  \033[37mdocker compose -f docker/docker-compose.yml up\033[0m"
