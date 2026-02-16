
# app/config.py

import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # API
    app_name: str = "PhotoBoom Magic Create"
    debug: bool = False
    
    # Qdrant
    qdrant_url: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    qdrant_api_key: str | None = os.getenv("QDRANT_API_KEY")
    qdrant_collection: str = "user_photos"
    
    # PostgreSQL
    database_url: str = os.getenv("DATABASE_URL", "postgresql://localhost/photoboom")
    
    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Google Cloud
    gcs_bucket: str = os.getenv("GCS_BUCKET", "photoboom-photos")
    
    # ML Settings
    clip_model: str = "ViT-B-32"
    clip_pretrained: str = "laion2b_s34b_b79k"
    device: str = "cuda" if os.getenv("USE_GPU") == "true" else "cpu"
    
    # Processing
    blur_threshold: float = 100.0
    duplicate_hash_threshold: int = 8  # Hamming distance
    batch_size: int = 32
    
    # Generation
    default_search_limit: int = 200
    heroes_per_event: int = 3
    min_hero_time_gap: int = 60  # seconds
    
    # Gemini
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model_flash: str = "gemini-2.5-flash"
    gemini_model_pro: str = "gemini-2.5-pro"
    
    # Design Engine
    enable_ai_backgrounds: bool = True
    max_decorations_per_page: int = 3
    background_generation_timeout: int = 60
    
    # Caching
    cache_themes: bool = True
    theme_cache_ttl: int = 3600  # 1 hour
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
