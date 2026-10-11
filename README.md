# MedChronicle

Turns a patient's medical documents into a **verified**, searchable, speakable health record.

```
Medical documents ─► Sarvam Document AI ─► Structured extraction (Gemini, JSON schema)
                                                   │
                                     Deterministic validation (app/validation.py)
                                  ┌────────────────┼──────────────────┐
                        PostgreSQL / Supabase   FHIR R4 resources   Qdrant (verified only)
                                                                       │
                     Question (text) ───────────────────────► Semantic retrieval (patient-scoped)
                     Voice ─► Sarvam STT ─► question text ──►        │
                                                              Gemini grounded answer
                                                          + citation & number guard
                                                       ┌──────────────┴──────────────┐
                                                    Text UI                    Sarvam TTS ─► audio
```

## What each stage guarantees

| Stage | Guarantee |
|---|---|
| Upload | Type sniffed from file bytes (PDF/PNG/JPEG only), 20 MB cap, filename sanitised, stored under a server id, SHA-256 dedup |
| Doc AI | `POST /doc-ai/v1/job/digitise` → poll status → results; HTML pages flattened to text |
| Extraction | Gemini with strict JSON schema; document wrapped as untrusted data; every item must quote its source line |
| **Validation** | 25-analyte catalogue with LOINC codes, unit conversion (g/L, mmol/L, °F, lakh/cumm…), physiological limits, date sanity (future / pre-birth), dose & frequency grammar, confidence threshold, and *grounding*: the source line must exist in the document and contain the value. Errors → `rejected`; warnings → `needs_review`; clean → `verified`. A clinician approval clears warnings, never errors. |
| Storage | Only `verified` records reach FHIR, Qdrant, RAG and summaries |
| Retrieval | Every Qdrant query carries a mandatory `patient_id` filter built server-side; hits are re-checked against the DB so a record rejected after indexing can't be used |
| Answer | Gemini must cite `[R#]`; a guard rejects unknown citations, uncited answers, and **any number not present in the cited records** (Indic digits normalised). On failure the user sees the matching verified records instead. No hits → "not in your records" without calling the LLM. |
| Voice | Sarvam `saaras:v3` STT (auto language detect) → answer in the detected language → Sarvam `bulbul:v3` TTS, chunked at 2,500 chars on sentence boundaries, WAVs concatenated, `[R#]` markers stripped |

## Run it

**Offline demo (no keys):**
```bash
cd backend && pip install -r requirements-dev.txt
MOCK_EXTERNAL=true ADMIN_API_KEY=demo-admin-key-0123456789abcdef uvicorn app.main:app_factory --factory --port 8000
cd ../frontend && npm install && npm run dev      # http://localhost:3000, sign in with the admin key
```

**Real services:** `cp backend/.env.example backend/.env`, fill in keys, then `docker compose up --build` (Postgres + backend + frontend; optional local Qdrant). For Supabase, set `DATABASE_URL` to the Supabase Postgres URI; tables are created on first start.

The browser sends API requests through the website's `/api` routes. Next.js forwards them to `http://127.0.0.1:8000` locally or `http://backend:8000` in Docker, so opening the website using another hostname does not require browser access to port 8000. To use a different backend, set `BACKEND_API_URL` when building and running the frontend. Leave `NEXT_PUBLIC_API_URL` unset for this default proxy setup.

For live AI, set `MOCK_EXTERNAL=false` with Gemini and Sarvam keys in `backend/.env`, then restart the backend. `gemini-2.5-flash` handles extraction and summaries; `gemini-embedding-001` supplies search vectors. Sarvam's `SARVAM_TTS_SPEAKER=auto` chooses a voice for each language (Ishita for English, Priya for Hindi), with a relaxed `SARVAM_TTS_PACE=0.9`.

Qdrant Cloud needs both the cluster URL and `QDRANT_API_KEY`. An optional `QDRANT_LOCAL_PATH=./qdrant-data/live` keeps vectors on disk while that key is missing. Adding the cloud key and restarting selects the cloud cluster; call `POST /api/admin/reindex?force=true` to copy all verified records to the new vector store. Use a separate database and upload directory for live records so demo fixtures are not mixed into real results.

After an upload finishes, choose a document (or verified health records) and a language in **Summary & audio**, then select **Generate summary**. Document overviews work for non-medical uploads too and are cached per document and language, separately from verified clinical records. Download the displayed summary as a UTF-8 `.txt` file; supported languages also offer playback and a `.wav` download of the same text. Text generation offers all 22 scheduled Indian languages plus English. Sarvam audio supports Bengali, Gujarati, Hindi, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu, and English; other selections show a text-only notice. Translation quality depends on the model and language.

Create users with the admin key: `POST /api/users {"name","role":"clinician"|"patient","patient_ids":[]}` → returns that user's API key once.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/patients` · GET `/api/patients[/{id}]` · DELETE | Patients (delete also purges vectors + files) |
| POST | `/api/patients/{id}/documents` | Upload → background pipeline (202) |
| GET | `/api/patients/{id}/records?status=&kind=` · `/timeline` | Records / verified timeline |
| POST | `/api/records/{id}/review` | Approve (with corrections, re-validated) or reject |
| GET | `/api/patients/{id}/fhir` | FHIR R4 Bundle (`application/fhir+json`) |
| GET | `/api/patients/{id}/search?q=&kind=&date_from=&date_to=` | Semantic search over verified records |
| POST | `/api/patients/{id}/ask` | Grounded answer with citations (11 languages) |
| GET | `/api/patients/{id}/summary[/audio]?language=` | Health summary text / WAV |
| POST | `/api/patients/{id}/voice/query` | Audio question → transcript + answer + WAV |
| POST | `/api/voice/transcribe` · `/api/voice/tts` | Raw STT / TTS |
| POST | `/api/admin/reindex` · GET `/api/patients/{id}/audit` | Recovery / audit trail |

## Tests

| Suite | Where | Count | What |
|---|---|---|---|
| Unit | `backend/tests/unit` | 120 | validation rules, extraction, FHIR mapping, grounding guard, TTS chunking, WAV, sniffing, redaction, rate limiter |
| External-service mocks | `backend/tests/external` | 21 | real Sarvam/Gemini clients vs respx: wire format, Doc AI polling, retries/backoff, 4xx vs 5xx, timeouts, no PHI echo |
| Vector DB | `backend/tests/vector` | 10 | real Qdrant engine (in-process): ranking, patient isolation, filters, idempotency, refusing unverified |
| Integration | `backend/tests/integration` | 19 | pipeline + DB + Qdrant + RAG, failure modes, hallucination fallback, prompt injection |
| API | `backend/tests/api` | 30 | every endpoint incl. voice and audio |
| Security | `backend/tests/security` | 47 | authn, RBAC, cross-patient 404s, upload hardening, SQL/prompt injection, header/CORS/log leakage, rate limit |
| Backend E2E | `backend/tests/e2e` | 2 | full journey through real client code with simulated upstream HTTP, plus outage degradation |
| Live smoke | `backend/tests/live` | 4 | real Sarvam/Gemini/Qdrant; `RUN_LIVE=1 pytest tests/live` |
| Frontend unit | `frontend/tests` | 11 | citation parsing, formatting, API client |
| UI E2E | `frontend/e2e` | 3 | Playwright: upload → timeline → review → ask → voice upload → **live mic recording** → spoken summary → search → FHIR download; patient-role isolation |

```bash
cd backend && pytest --cov=app            # 249 passed, 4 live skipped, 96% coverage
cd frontend && npm test && npx playwright test
```

## Security notes
- API keys are SHA-256 hashed at rest, returned once, sent as `Authorization: Bearer`; the browser keeps them in `sessionStorage` only.
- Unauthorised patient IDs return 404 (no enumeration). Audit log records actions, never clinical values.
- Logs pass through a redaction filter (API keys, Aadhaar-like numbers, phone numbers, emails). Upstream error bodies are never echoed.
- Secrets live only in `.env` / CI secrets. **Rotate any key that has been pasted into chat or committed.**
