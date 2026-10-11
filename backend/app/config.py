"""Application settings. All secrets come from environment variables / .env — never from code."""
from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "MEDORA AI"
    environment: str = "development"

    # --- Persistence -------------------------------------------------------
    # PostgreSQL / Supabase in production, e.g.
    # postgresql+psycopg://postgres:<pw>@db.<ref>.supabase.co:5432/postgres
    database_url: str = "sqlite:///./medchronicle.db"
    upload_dir: str = "./uploads"

    # --- Auth ---------------------------------------------------------------
    require_auth: bool = False
    admin_api_key: SecretStr = SecretStr("")  # bootstrap admin key (rotate after first login)
    rate_limit_per_minute: int = 120
    cors_origins: list[str] = [
        "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"]

    # --- Uploads -----------------------------------------------------------
    max_document_bytes: int = 20 * 1024 * 1024
    max_audio_bytes: int = 10 * 1024 * 1024

    # --- External services --------------------------------------------------
    # mock_external=True swaps every external client for a deterministic offline fake.
    mock_external: bool = False
    http_timeout_seconds: float = 60.0
    http_max_retries: int = 3

    sarvam_api_key: SecretStr = SecretStr("")
    sarvam_base_url: str = "https://api.sarvam.ai"
    sarvam_stt_model: str = "saaras:v3"
    sarvam_tts_model: str = "bulbul:v3"
    sarvam_tts_speaker: str = "auto"
    sarvam_tts_pace: float = Field(default=0.9, ge=0.5, le=2.0)
    sarvam_tts_max_chars: int = 2500
    sarvam_docai_poll_seconds: float = 2.0
    sarvam_docai_timeout_seconds: float = 300.0

    gemini_api_key: SecretStr = SecretStr("")
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    gemini_model: str = "gemini-3.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"
    embedding_dim: int = 768

    qdrant_url: str = ":memory:"  # e.g. https://<cluster>.cloud.qdrant.io:6333
    qdrant_api_key: SecretStr = SecretStr("")
    qdrant_collection: str = "medchronicle_records"
    # Explicit local storage while a cloud key is being configured.
    qdrant_local_path: str | None = None

    # --- Validation / RAG ----------------------------------------------------
    min_extraction_confidence: float = 0.80
    rag_top_k: int = 8
    rag_score_threshold: float = 0.30


@lru_cache
def get_settings() -> Settings:
    return Settings()
