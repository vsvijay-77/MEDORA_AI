# MEDORA_AI

> **AI-Powered Multilingual Personal Health Copilot, Verified Clinical Vault & Agentic RAG Platform**

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://medora-ai-virid.vercel.app)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?logo=react)](https://vitejs.dev)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=google)](https://aistudio.google.com)
[![Sarvam](https://img.shields.io/badge/Voice-Sarvam_AI_Bulbul-FF6F00)](https://sarvam.ai)
[![FHIR R4](https://img.shields.io/badge/Standard-HL7_FHIR_R4-E65100)](https://hl7.org/fhir)

**Live Production Preview:** [https://medora-ai-virid.vercel.app](https://medora-ai-virid.vercel.app)

---

## 🌟 Overview

**MEDORA AI** transforms scattered paper prescriptions, discharge summaries, and complex laboratory PDFs into a **clinically verified, searchable, speakable, and actionable personal health history**.

By combining **Google Gemini Agentic RAG**, **Sarvam AI Bulbul neural speech**, and **Qdrant vector search**, MEDORA AI enables patients and clinicians to query medical records in **23 Indian scheduled languages** with strict numerical grounding, provenance citations (`[R#]`), and zero hallucinations.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MEDORA AI ARCHITECTURE                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘

  Medical Documents (PDF/Images)
               │
               ▼
   [ Sarvam Document AI / OCR ]
               │
               ▼
  [ Gemini Structured Extraction ] ── (Strict JSON Schema)
               │
               ▼
 [ Deterministic Clinical Validator ] ── (25-Analyte Catalogue, Unit Conversion, Ref Ranges)
        ┌──────┴─────────────────────────────────┐
        ▼                                        ▼
 [ PostgreSQL / SQLite ]              [ HL7 FHIR R4 Bundles ]
        │
        ▼
 [ Qdrant Vector Store ] ── (Patient-Scoped Semantic Chunks)
        │
 ═══════╪══════════════════════════════════════════════════════════════════════════════════
        │
  User Voice / Text Query ── (23 Indian Languages: Tamil, Hindi, Telugu, etc.)
        │
        ▼
 [ Agentic RAG Engine (Gemini) ] ── (Context Retrieval + Strict Citation & Number Guard)
        │
        ▼
   Grounded Answer [R1][R2]
        │
        ├──────────────────────────────┐
        ▼                              ▼
  [ React 18 Web UI ]      [ Sarvam Bulbul TTS Audio ]
```

---

## 🚀 Key Features

### 1. 🤖 Agentic RAG Health Copilot
- **Grounded Clinical Retrieval**: Dynamically fetches relevant patient records from Qdrant with mandatory `patient_id` isolation.
- **Strict Provenance Guard**: Every factual sentence cites its source report (`[R1]`, `[R2]`). Any unverified numbers or hallucinations are automatically intercepted.
- **Prescription Explainer**: Plain-language explanations of medication mechanisms, dosages, potential food interactions, and contraindications.

### 2. 🌐 23 Scheduled Indian Languages + Voice (STT & TTS)
- **Top Language Synchronization**: Selecting a language in the header (Tamil, Hindi, Telugu, Kannada, Bengali, Malayalam, etc.) instantly synchronizes:
  - **Speech-to-Text (STT)**: Listens in the selected regional BCP-47 locale (`ta-IN`, `hi-IN`, `te-IN`, etc.).
  - **Text-to-Speech (TTS)**: Synthesizes high-fidelity 22,050 Hz PCM audio using Sarvam AI Bulbul neural voices (`/api/voice/tts`) with browser speech fallback.
  - **Multilingual RAG**: Gemini generates responses directly in the target native script (`தமிழ்`, `हिंदी`, `తెలుగు`, etc.).

### 3. 💊 Daily Medication Timetable ("What Time What Medicine To Take")
- **Chronological Time Slots**: Categorized into *Early Morning (07:00 AM)*, *Post-Breakfast (08:30 AM)*, *Post-Lunch (01:30 PM)*, *Post-Dinner (08:30 PM)*, *Bedtime (10:00 PM)*, and *Weekly Specialty doses*.
- **Food Administration Guidance**: Clear instructions on empty-stomach requirements versus post-meal consumption.
- **Interactive Adherence Tracking**: Stateful checkmarks (**Mark Taken** ⇄ **Taken ✓**) with a real-time progress bar saved to local storage.
- **Voice Timetable Readout**: One-click audio readout of the day's schedule in any selected language.

### 4. 🏥 FHIR R4 & ABDM Compliance
- Exports patient data into standard **HL7 FHIR Release 4** resources (`Patient`, `MedicationRequest`, `Observation`, `DiagnosticReport`, `Condition`).
- Aligned with **DISHA** (Digital Information Security in Healthcare Act) protocols.

### 5. 📈 Longitudinal Lab Trends & Biomarker Tracking
- Tracks metabolic panel trends (Fasting Blood Sugar, HbA1c, Hemoglobin, Lipid Profile, TSH) across historical visits with visual indicators and reference ranges.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Material-UI (MUI v5), React Router DOM, TanStack Query, Axios |
| **Backend API** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy |
| **Database** | SQLite (development) / PostgreSQL or Supabase (production) |
| **Vector Engine** | Qdrant Cloud / Local Vector Store |
| **LLM & Embeddings** | Google Gemini (`gemini-2.5-flash`, `gemini-embedding-001`) |
| **Voice Processing** | Sarvam AI (`saaras:v3` STT, `bulbul:v3` TTS) |
| **Deployment** | Vercel (Frontend SPA), Docker / Uvicorn (Backend) |

---

## 📦 Project Structure

```
medora-ai/
├── frontend/                     # React + Vite TypeScript Single-Page Application
│   ├── src/
│   │   ├── api/                  # Axios HTTP client & endpoint bindings
│   │   ├── components/           # Reusable UI widgets, Header, Sidebar, MetricCards
│   │   ├── contexts/             # AuthContext & patient profile state
│   │   ├── pages/                # CopilotPage, TimelinePage, DashboardPage, etc.
│   │   ├── tests/                # Vitest & Testing Library test suite
│   │   └── types/                # TypeScript interfaces & 23 language definitions
│   ├── package.json              # Frontend npm dependencies & scripts
│   ├── vite.config.ts            # Vite build & proxy configuration
│   └── vercel.json               # Vercel SPA routing rewrite configuration
│
├── backend/                      # FastAPI Python REST Application
│   ├── app/
│   │   ├── api/                  # REST route handlers (/ask, /voice, /patients)
│   │   ├── services/             # Gemini RAG, Sarvam TTS/STT, Qdrant vector store
│   │   ├── config.py             # Pydantic Settings & environment variables
│   │   ├── db.py                 # SQLAlchemy session and schema migrations
│   │   ├── fhir.py               # HL7 FHIR R4 export engine
│   │   └── validation.py         # Deterministic clinical validation rules
│   ├── requirements.txt          # Python runtime dependencies
│   ├── requirements-dev.txt      # Pytest & development tools
│   └── .env.example              # Backend environment variable template
│
├── vercel.json                   # Root Vercel deployment configuration
├── docker-compose.yml            # Multi-container Docker deployment
└── README.md                     # Master documentation
```

---

## ⚙️ Environment Variables Setup

Copy the example environment files to create your active configuration:

### 1. Backend (`backend/.env`)
```bash
cp backend/.env.example backend/.env
```

Key variables to configure:
```env
# Mode: true = deterministic offline mocks; false = real APIs
MOCK_EXTERNAL=false

# Google Gemini API Key (https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001

# Sarvam AI Key (https://www.sarvam.ai/)
SARVAM_API_KEY=your_sarvam_api_key_here

# Qdrant Vector DB
QDRANT_URL=https://your-cluster-id.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key_here
QDRANT_COLLECTION=medora_records

# Database Connection (Default SQLite or PostgreSQL)
DATABASE_URL=sqlite:///./medora.db

# Security
ADMIN_API_KEY=medora_admin_secret_key_1234567890abcdef
CORS_ORIGINS=["http://localhost:3000","https://medora-ai-virid.vercel.app"]
```

### 2. Frontend (`frontend/.env`)
```bash
cp frontend/.env.example frontend/.env
```
```env
# Backend API base URL
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 🚀 Step-by-Step Setup & How To Use

### Prerequisites
- **Node.js**: `v18+` or `v20+`
- **Python**: `3.11+`
- **Git**

---

### Option A: Running Locally (Fastest)

#### 1. Start the Backend API
```bash
# Navigate to backend
cd backend

# Create and activate python virtual environment
python3 -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app_factory --factory --reload --port 8000
```
- API Documentation (Swagger UI): **http://localhost:8000/docs**

#### 2. Start the Frontend
In a separate terminal:
```bash
# Navigate to frontend
cd frontend

# Install npm packages
npm install

# Start Vite dev server
npm run dev
```
- Application Web App: **http://localhost:3000**

---

### Option B: Running with Docker Compose
```bash
# Build and start all services (Backend + Frontend + Postgres)
docker compose up --build
```
- Frontend: **http://localhost:3000**
- Backend: **http://localhost:8000**

---

## 🧪 Running Tests

### Frontend Unit & Component Tests
```bash
cd frontend
npm test
```
*Executes 9 automated Vitest test suites verifying UI rendering, STT/TTS language mapping, question-specific RAG generation, and medication timetables.*

### Backend Unit & Integration Tests
```bash
cd backend
source .venv/bin/activate
pytest --cov=app
```
*Executes comprehensive tests across clinical validation, extraction guards, FHIR bundles, and vector retrieval.*

---

## 🌐 Deploying on Vercel

MEDORA AI includes pre-configured `vercel.json` files for zero-configuration deployment:

1. **Deploy via Vercel CLI**:
   ```bash
   npx vercel --prod
   ```
2. **Deploy via GitHub**:
   - Push your code to your GitHub repository.
   - Import the repository on [vercel.com/new](https://vercel.com/new).
   - Set `VITE_API_BASE_URL` in **Project Settings → Environment Variables** to your backend URL.
   - Click **Deploy**.

---

## 🔒 Security & Privacy Notes

- **Zero Data Leakage**: Patient data is isolated using server-side query filters on `patient_id`.
- **Redaction Filter**: Access logs pass through redaction filters stripping API keys, Aadhaar/ABHA identifiers, and phone numbers.
- **Local Fallbacks**: When external AI keys are omitted, MEDORA AI functions gracefully using deterministic clinical mock models.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
