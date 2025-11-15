#!/bin/bash
# Activation script for XP Lab environment

echo "🚀 Activating XP Lab Environment..."

# Activate Python virtual environment
source venv/bin/activate

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "✅ Python environment activated"
echo "✅ Environment variables loaded"
echo ""
echo "📋 Available commands:"
echo "  - Start backend: uvicorn app.main:app --reload"
echo "  - Start frontend: npm run dev"
echo "  - Deactivate: deactivate"
echo ""
