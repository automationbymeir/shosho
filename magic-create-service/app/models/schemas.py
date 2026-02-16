
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

# --- Enums ---

class IndexingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class PhotoQuality(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    REJECTED = "rejected"

# --- Request Models ---

class IngestRequest(BaseModel):
    user_id: str
    google_photos_token: str
    album_id: Optional[str] = None  # None = entire library
    
class GenerateRequest(BaseModel):
    user_id: str
    theme: str = Field(..., example="Summer Vacation 2024")
    max_pages: int = Field(default=20, ge=1, le=50)
    photos_per_page: int = Field(default=3, ge=1, le=6)
    include_faces: Optional[list[str]] = None  # Face IDs to include
    exclude_faces: Optional[list[str]] = None  # Face IDs to exclude
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None

# --- Response Models ---

class PhotoRecord(BaseModel):
    id: str
    user_id: str
    google_photo_id: str
    gcs_path: str
    thumbnail_url: str
    capture_time: datetime
    latitude: Optional[float]
    longitude: Optional[float]
    aesthetic_score: float
    quality: PhotoQuality
    width: int
    height: int
    is_portrait: bool
    has_faces: bool
    face_count: int
    
class EventCluster(BaseModel):
    event_id: int
    event_name: Optional[str]
    start_time: datetime
    end_time: datetime
    location_name: Optional[str]
    hero_photos: list[PhotoRecord]
    all_photo_ids: list[str]
    
class BookLayout(BaseModel):
    book_id: str
    user_id: str
    theme: str
    created_at: datetime
    pages: list[EventCluster]
    total_photos: int
    cover_photo: PhotoRecord

class IngestStatusResponse(BaseModel):
    job_id: str
    user_id: str
    status: IndexingStatus
    total_photos: int
    processed_photos: int
    indexed_photos: int
    rejected_photos: int
    progress_percent: float
    estimated_time_remaining: Optional[int]  # seconds
    error_message: Optional[str]
