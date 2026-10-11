from __future__ import annotations

from collections.abc import Iterator

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import AuditLog, Patient, PatientAccess, User
from ..security import hash_api_key


def get_db(request: Request) -> Iterator[Session]:
    yield from request.app.state.db.session()


def get_services(request: Request):
    return request.app.state.services


def _extract_key(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None
    return request.headers.get("x-api-key") or None


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    key = _extract_key(request)
    if key:
        user = db.scalar(select(User).where(User.api_key_hash == hash_api_key(key), User.active.is_(True)))
        if not user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key", headers={"WWW-Authenticate": "Bearer"})
        if not request.app.state.limiter.allow(user.id):
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Rate limit exceeded", headers={"Retry-After": "60"})
        return user

    settings = getattr(request.app.state, "settings", None)
    if settings and not settings.require_auth:
        admin = db.scalar(select(User).where(User.role == "admin", User.active.is_(True)))
        if admin:
            return admin

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing API key", headers={"WWW-Authenticate": "Bearer"})


def require_roles(*roles: str):
    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role")
        return user

    return dep


def can_access(db: Session, user: User, patient_id: str) -> bool:
    if user.role == "admin":
        return True
    return db.scalar(select(PatientAccess.id).where(PatientAccess.user_id == user.id, PatientAccess.patient_id == patient_id)) is not None


def get_patient(patient_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Patient:
    p = db.get(Patient, patient_id)
    # 404 (not 403) for both missing and forbidden, so IDs can't be probed.
    if p is None or not can_access(db, user, patient_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    return p


def audit(db: Session, user: User | None, action: str, patient_id: str | None = None, **detail) -> None:
    db.add(AuditLog(user_id=user.id if user else None, action=action, patient_id=patient_id, detail=detail))
    db.commit()
