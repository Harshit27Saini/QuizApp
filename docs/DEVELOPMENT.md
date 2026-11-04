# Development Guide — Recall

## Prerequisites
- **Python:** 3.9+
- **Node.js:** v18+ (tested on Node v24)
- **npm:** v9+
- **Git**

---

## 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (cmd):
.\venv\Scripts\activate.bat
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env

# Run development server
uvicorn app.main:app --reload --port 8000
```
Backend API will be accessible at: `http://localhost:8000`
Interactive Swagger Docs: `http://localhost:8000/docs`

---

## 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
copy .env.example .env

# Run Vite dev server
npm run dev
```
Frontend web application will run at: `http://localhost:5173`

---

## 3. Database & Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Open `supabase/migrations/20261104000000_init_schema.sql` and run the script.
4. Copy your project URL and `anon` key from **Project Settings $\rightarrow$ API** into `backend/.env` and `frontend/.env`.

---

## 4. Running Automated Tests

```bash
cd backend
pytest -v
```

All test files reside in `backend/tests/` and cover:
- Document extraction (PDF, DOCX, PPTX, TXT)
- Sectionizer logic
- Quiz generation & schema validation
- Deterministic grading and attempt scoring
- REST API endpoint verification
