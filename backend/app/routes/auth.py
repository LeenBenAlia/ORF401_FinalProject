from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Dict, Optional
import hashlib
import uuid

from .. import persistence

router = APIRouter()


class SignupRequest(BaseModel):
    company_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


COMPANY_STORE: Dict[str, Dict[str, str]] = {}
SESSION_STORE: Dict[str, str] = {}


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _seed_companies() -> None:
    seed = [
        ("Tesla", "tesla@blaise.ai", "Model3Ride!"),
        ("SpaceX", "spacex@blaise.ai", "Starlink2026!"),
        ("Nvidia", "nvidia@blaise.ai", "AdaGPU#1"),
    ]
    for company_name, email, password in seed:
        if email not in COMPANY_STORE:
            COMPANY_STORE[email] = {
                "id": uuid.uuid4().hex,
                "company_name": company_name,
                "email": email,
                "password_hash": _hash_password(password),
            }


def hydrate_company_store() -> None:
    """Restore registered companies from disk (stable ids), then ensure seed demo accounts exist."""
    disk = persistence.load_company_store()
    if disk:
        COMPANY_STORE.update(disk)
    _seed_companies()
    persistence.save_company_store(COMPANY_STORE)


def get_company_from_auth_header(authorization: Optional[str]) -> Dict[str, str]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid auth token")
    token = authorization.split(" ", 1)[1].strip()
    email = SESSION_STORE.get(token)
    if not email or email not in COMPANY_STORE:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return COMPANY_STORE[email]


@router.post("/auth/signup")
async def signup(payload: SignupRequest):
    email = payload.email.lower()
    if email in COMPANY_STORE:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    COMPANY_STORE[email] = {
        "id": uuid.uuid4().hex,
        "company_name": payload.company_name.strip() or "Company",
        "email": email,
        "password_hash": _hash_password(payload.password),
    }
    token = uuid.uuid4().hex
    SESSION_STORE[token] = email
    persistence.save_company_store(COMPANY_STORE)
    return {"token": token, "company": {k: v for k, v in COMPANY_STORE[email].items() if k != "password_hash"}}


@router.post("/auth/login")
async def login(payload: LoginRequest):
    email = payload.email.lower()
    record = COMPANY_STORE.get(email)
    if not record or record["password_hash"] != _hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = uuid.uuid4().hex
    SESSION_STORE[token] = email
    return {"token": token, "company": {k: v for k, v in record.items() if k != "password_hash"}}


@router.get("/auth/me")
async def me(authorization: Optional[str] = Header(None)):
    company = get_company_from_auth_header(authorization)
    return {"company": {k: v for k, v in company.items() if k != "password_hash"}}
