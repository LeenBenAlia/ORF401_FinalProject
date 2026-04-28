import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import quotes, export, auth

app = FastAPI(title="BlaiseAI", description="Supplier Quote Processing API")

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
)
origin_list = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origin_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://[A-Za-z0-9-]+\.github\.io$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(quotes.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")


@app.on_event("startup")
async def startup_load_persistent_store():
    """Restore companies then quotes/folders — stable company ids tie quotes to the right tenant."""
    from .routes.auth import hydrate_company_store
    from .routes.quotes import hydrate_quote_store

    hydrate_company_store()
    hydrate_quote_store()


@app.get("/api/v1/health")
async def health():
    """Lightweight check so you can verify the API is running before signing in."""
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "Welcome to BlaiseAI API"}