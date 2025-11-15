# XP Lab - Environment Setup & Activation

## ✅ Environment Successfully Configured!

Your XP Lab project now has both Python backend and React frontend environments ready to go.

---

## 🚀 Quick Start

### Option 1: Use the Activation Script (Recommended)

```bash
# Activate everything at once
source activate.sh

# Then run backend
uvicorn app.main:app --reload

# In a new terminal, run frontend
npm run dev
```

### Option 2: Manual Activation

**For Python Backend:**
```bash
# 1. Activate virtual environment
source venv/bin/activate

# 2. Environment variables are automatically loaded via python-dotenv
# (No need to manually source .env)

# 3. Start the backend server
uvicorn app.main:app --reload
```

**For React Frontend:**
```bash
# Just run the dev server
npm run dev
```

---

## 📋 Environment Variables

Your `.env` file contains:

- **Supabase Configuration**
  - `SUPABASE_URL` - Database URL
  - `SUPABASE_KEY` - Public API key
  - `SUPABASE_SERVICE_KEY` - Admin key
  
- **OpenAI API**
  - `OPENAI_API_KEY` - For AI features
  
- **Database**
  - `DATABASE_URL` - PostgreSQL connection

---

## 🔧 How It Works

### Python Backend (automatic)
The backend uses `python-dotenv` which automatically loads `.env` when you run:
```python
from dotenv import load_dotenv
load_dotenv()
```

This is already configured in your FastAPI app!

### React Frontend (if needed)
For Vite to access env variables, they must be prefixed with `VITE_`:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...
```

Then access them:
```javascript
const url = import.meta.env.VITE_SUPABASE_URL
```

---

## 🎯 Running the Full Stack

### Terminal 1: Backend
```bash
source activate.sh
uvicorn app.main:app --reload
```
Backend runs at: `http://localhost:8000`

### Terminal 2: Frontend
```bash
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## 🛠️ Useful Commands

```bash
# Activate Python environment
source venv/bin/activate

# Deactivate Python environment
deactivate

# Install new Python packages
pip install <package-name>

# Update requirements.txt
pip freeze > requirements.txt

# Install new npm packages
npm install <package-name>

# Check Python environment
which python
python --version

# Check loaded environment variables (Python)
python -c "import os; print(os.getenv('SUPABASE_URL'))"
```

---

## 📦 Installed Dependencies

### Python Backend
✅ FastAPI - Web framework
✅ Uvicorn - ASGI server
✅ Supabase - Database client
✅ OpenAI - AI integration
✅ Python-dotenv - Environment variables
✅ Pydantic - Data validation
✅ WebSockets - Real-time features

### React Frontend
✅ React 18 - UI framework
✅ Vite - Build tool
✅ React Router - Navigation
✅ TailwindCSS - Styling
✅ Recharts - Analytics charts
✅ Framer Motion - Animations

---

## 🔒 Security Notes

⚠️ **IMPORTANT:**
- `.env` file is **gitignored** - Never commit it!
- Never share your API keys publicly
- `SUPABASE_SERVICE_KEY` has admin access - use carefully
- Keep `OPENAI_API_KEY` secure

---

## 🐛 Troubleshooting

### "Command not found: uvicorn"
```bash
source venv/bin/activate
```

### "Module not found"
```bash
pip install -r requirements.txt
```

### "Environment variable not found"
Check that `.env` exists and contains the correct values:
```bash
cat .env
```

### Frontend can't connect to backend
Make sure both servers are running:
- Backend: http://localhost:8000
- Frontend: http://localhost:5173

---

## 🎉 You're Ready!

Your XP Lab environment is fully configured and ready for development!

**Next steps:**
1. Run the backend: `source activate.sh && uvicorn app.main:app --reload`
2. Run the frontend: `npm run dev` (in a new terminal)
3. Visit: http://localhost:5173

Happy coding! 🚀
