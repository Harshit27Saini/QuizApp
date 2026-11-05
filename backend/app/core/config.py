from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://quiz-app-dusky-nine-68.vercel.app"

    # Firebase configuration (optional for offline mock mode)
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""  # path to serviceAccountKey.json
    FIREBASE_STORAGE_BUCKET: str = ""

    # AI Configuration: 'mock', 'gemini', or 'groq'
    AI_PROVIDER: str = "mock"
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # Upload constraints
    MAX_UPLOAD_SIZE_MB: int = 25

    # JWT Authentication
    JWT_SECRET: str = "recall_jwt_playtest_secret_key_2026"

    # Founder / Dev Admin configuration
    ADMIN_EMAILS: str = "dev@recall.local,harshit,admin@recall.local"
    FOUNDER_PASSCODE: str = "recall-founder-2026"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def admin_email_list(self) -> List[str]:
        return [email.strip().lower() for email in self.ADMIN_EMAILS.split(",") if email.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


settings = Settings()
