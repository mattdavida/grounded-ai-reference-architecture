import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import BACKEND_DIR, settings
from app.routers import alerts, capacity, chat, dashboard, exports, health, projects, speech

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

logger = logging.getLogger(__name__)


def _log_startup_config() -> None:
    """Log key config values so env loading issues surface immediately in the worker."""
    env_file = BACKEND_DIR / ".env"
    logger.info("=== EAIM Backend startup config ===")
    logger.info("  BACKEND_DIR    : %s", BACKEND_DIR)
    logger.info("  .env path      : %s (exists=%s)", env_file, env_file.exists())
    logger.info("  speech key set : %s", bool(settings.azure_speech_api_key))
    logger.info("  openai key set : %s", bool(settings.azure_openai_api_key))
    logger.info("  speech region  : %s", settings.azure_speech_region)
    logger.info("===================================")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _log_startup_config()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="EAIM Reference Architecture API",
        version="0.1.0",
        description=(
            "Backend API for the Enterprise AI Modernization Reference Architecture — "
            "grounded conversational AI over precomputed portfolio metrics."
        ),
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(projects.router)
    app.include_router(dashboard.router)
    app.include_router(capacity.router)
    app.include_router(alerts.router)
    app.include_router(exports.router)
    app.include_router(speech.router)
    app.include_router(chat.router)
    return app


app = create_app()
