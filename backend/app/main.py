import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging

# Import models to ensure they're registered with Base before creating tables
from app.models import init_db

# Import API routers
from app.api import overview, comparacoes, insights, previsoes, sync, export, dashboard

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="CPEE Dashboard API",
    description="Campaign analytics for Podemos",
    version="1.0.0"
)

# Initialize database tables on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# CORS for Next.js frontend
_cors_origins = ["http://localhost:3000", "http://localhost:5000", "https://dashboard-prod-six.vercel.app"]
_extra_origin = os.getenv("CORS_ORIGIN")
if _extra_origin:
    _cors_origins.append(_extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(overview.router)
app.include_router(comparacoes.router)
app.include_router(insights.router)
app.include_router(previsoes.router)
app.include_router(sync.router)
app.include_router(export.router)
app.include_router(dashboard.router)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
