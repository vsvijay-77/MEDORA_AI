from dataclasses import dataclass
import logging

from ..config import Settings
from .rag import RagService
from .vector_store import VectorStore


@dataclass
class Services:
    settings: Settings
    sarvam: object
    gemini: object
    vectors: VectorStore
    rag: RagService


def build_services(settings: Settings) -> Services:
    if settings.mock_external:
        from .fakes import FakeGemini, FakeSarvam

        sarvam, gemini = FakeSarvam(settings.sarvam_tts_max_chars), FakeGemini(settings.embedding_dim)
    else:
        from .gemini import GeminiClient
        from .sarvam import SarvamClient

        sarvam, gemini = SarvamClient(settings), GeminiClient(settings)
    qdrant_key = settings.qdrant_api_key.get_secret_value()
    local_path = settings.qdrant_local_path if not qdrant_key and not settings.mock_external else None
    if local_path:
        logging.getLogger("medchronicle").warning("Using persistent local Qdrant storage until a cloud API key is configured.")
    vectors = VectorStore(settings.qdrant_url, qdrant_key,
                          settings.qdrant_collection, settings.embedding_dim, local_path=local_path)
    vectors.ensure_collection()
    return Services(settings, sarvam, gemini, vectors, RagService(gemini, vectors, settings))
