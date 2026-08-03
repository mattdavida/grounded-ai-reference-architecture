from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # deploy.ps1 writes backend/.env directly (UTF-8, no special chars).
    # utf-8-sig tolerates files saved by Windows tools (BOM or no BOM).
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8-sig",
        extra="ignore",
    )

    database_url: str = f"sqlite:///{BACKEND_DIR / 'dev.db'}"
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:4001",
            "http://127.0.0.1:4001",
        ]
    )
    log_level: str = "INFO"

    # ── Azure OpenAI (LangGraph chat pipeline) ────────────────────────────────
    # Optional: the app starts without them. Chat routes return 503 if unset.
    azure_openai_api_key: str | None = None
    azure_openai_endpoint: str | None = None
    azure_openai_api_version: str = "2024-02-01"
    azure_openai_chat_deployment: str = "gpt-5.4"

    # ── Azure Speech Services (speech token endpoint) ─────────────────────────
    # Key never reaches the browser — /api/speech/token exchanges it for a
    # short-lived (10-min) access token that the Speech SDK uses client-side.
    azure_speech_api_key: str | None = None
    azure_speech_region: str = "eastus"

    # ── LangGraph conversation checkpointer ───────────────────────────────────
    checkpoints_db: str = str(BACKEND_DIR / "voice_chat.db")


settings = Settings()
