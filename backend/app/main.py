from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from .api.routes import router
from .config import Settings, get_settings
from .db import Database
from .models import User
from .security import RateLimiter, hash_api_key, install_log_redaction
from .services import Services, build_services
from .services.http import ExternalServiceError

log = logging.getLogger("medchronicle")


def _bootstrap_admin(db: Database, settings: Settings) -> None:
    key = settings.admin_api_key.get_secret_value() or "demo-admin-key-0123456789abcdef"
    if len(key) < 24:
        raise RuntimeError("ADMIN_API_KEY must be at least 24 characters")
    s = db.SessionLocal()
    try:
        h = hash_api_key(key)
        admin = s.scalar(select(User).where(User.role == "admin"))
        if not admin:
            s.add(User(name="Administrator", role="admin", api_key_hash=h))
            s.commit()
        elif admin.api_key_hash != h and settings.admin_api_key.get_secret_value():
            admin.api_key_hash = h
            s.commit()
    finally:
        s.close()


def create_app(settings: Settings | None = None, services: Services | None = None) -> FastAPI:
    settings = settings or get_settings()
    install_log_redaction()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        app.state.services.vectors.client.close()
        app.state.db.engine.dispose()

    app = FastAPI(title=settings.app_name, version="2.0.0", lifespan=lifespan,
                  docs_url="/docs" if settings.environment != "production" else None, redoc_url=None)
    db = Database(settings.database_url)
    db.create_all()
    _bootstrap_admin(db, settings)
    app.state.settings = settings
    app.state.db = db
    app.state.services = services or build_services(settings)
    app.state.limiter = RateLimiter(settings.rate_limit_per_minute)

    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=False,
                       allow_methods=["GET", "POST", "DELETE"], allow_headers=["Authorization", "Content-Type", "X-API-Key"])

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        resp = await call_next(request)
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "no-referrer")
        resp.headers.setdefault("Cache-Control", "no-store")
        resp.headers.setdefault("Permissions-Policy", "camera=(), geolocation=()")
        if not request.url.path.startswith("/docs"):
            resp.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        return resp

    @app.exception_handler(ExternalServiceError)
    async def upstream_error(_: Request, exc: ExternalServiceError):
        return JSONResponse({"detail": exc.safe_message}, status_code=502)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        # Don't echo submitted values back (they may contain PHI).
        errs = [{"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")} for e in exc.errors()]
        return JSONResponse({"detail": errs}, status_code=422)

    @app.get("/health")
    def health():
        return {"status": "ok", "mock_external": settings.mock_external}

    app.include_router(router)
    return app


def app_factory() -> FastAPI:  # uvicorn app.main:app_factory --factory
    return create_app()
