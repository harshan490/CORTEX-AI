from pydantic_settings import BaseSettings
from typing import Literal, Optional, ClassVar


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/cortex"
    REDIS_URL: str = "redis://localhost:6379/0"
    QDRANT_URL: str = "http://localhost:6333"

    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_STORE_RESPONSES: bool = False

    CEREBRAS_API_KEY: str = ""
    CEREBRAS_MODEL: str = "gemma-4-31b"
    CEREBRAS_BASE_URL: str = "https://api.cerebras.ai/v1"

    LLM_PROVIDER: Literal["mock", "openai", "ollama", "cerebras"] = "mock"
    LLM_MOCK_MODE: bool = True
    LLM_TIMEOUT_SECONDS: int = 60
    LLM_MAX_RETRIES: int = 2

    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen3:4b-instruct"

    JWT_SECRET: str = "change-this-secret-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    WHISPER_MODEL: str = "base"
    LLM_MODEL: str = "gpt-4"
    EMBEDDING_MODEL: str = "BAAI/bge-base-en-v1.5"

    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    SLACK_BOT_TOKEN: Optional[str] = None
    SLACK_SIGNING_SECRET: Optional[str] = None

    JIRA_URL: Optional[str] = None
    JIRA_USERNAME: Optional[str] = None
    JIRA_API_TOKEN: Optional[str] = None

    NOTION_API_KEY: Optional[str] = None

    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "DEBUG"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
