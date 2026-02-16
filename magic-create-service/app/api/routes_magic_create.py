
# app/api/routes_magic_create.py

from fastapi import APIRouter, HTTPException, Depends
import time
import uuid
from datetime import datetime

from app.models.design_schemas import (
    MagicCreateRequest, MagicCreateResponse, DesignedAlbum,
    DesignStyle
)
from app.services.design_engine import DesignEngine

# Mock dependencies for now since we don't have the full DB/BookGenerator stack in this Phase 1
from app.models.schemas import BookLayout, EventCluster, PhotoRecord, PhotoQuality

router = APIRouter(prefix="/magic", tags=["Magic Create"])

_design_engine = None

def get_design_engine():
    global _design_engine
    if _design_engine is None:
        _design_engine = DesignEngine()
    return _design_engine

# Mock BookGenerator for Phase 1 verification
class MockBookGenerator:
    def generate(self, request):
        import random
        # Estimate needed photos from request (which might just have user_id)
        # We don't have access to the raw photo count here in the mock without passing it.
        # But we can just generate a fixed number or random number of pages.
        
        # Let's create a richer mock book with multiple pages
        pages = []
        
        # Determine number of pages (mock: 3-5)
        num_pages = 5
        
        for i in range(num_pages):
            # Create 1-4 mock photos per page
            photos = []
            num_photos = random.randint(1, 4)
            for j in range(num_photos):
                photos.append(PhotoRecord(
                    id=f"mock_photo_p{i}_{j}", # Deterministic IDs for testing
                    user_id=request.user_id,
                    google_photo_id=f"g_p{i}_{j}",
                    gcs_path=f"gs://mock/p{i}_{j}.jpg",
                    thumbnail_url="https://placehold.co/400",
                    capture_time=datetime.now(),
                    latitude=0, longitude=0, aesthetic_score=0.9,
                    quality=PhotoQuality.HIGH, width=1000, height=1000,
                    is_portrait=random.choice([True, False]), 
                    has_faces=True, face_count=1
                ))
            
            pages.append(EventCluster(
                event_id=i, 
                event_name=f"Mock Event {i+1}", 
                start_time=datetime.now(), end_time=datetime.now(),
                location_name="Test Loc", 
                hero_photos=photos,
                all_photo_ids=[p.id for p in photos]
            ))

        return BookLayout(
            book_id="mock_book_v2", 
            user_id=request.user_id, 
            theme="Enhanced Mock Theme",
            created_at=datetime.now(), 
            total_photos=sum(len(p.hero_photos) for p in pages),
            pages=pages,
            cover_photo=PhotoRecord(
                id="mock_cover_1", 
                user_id=request.user_id, 
                google_photo_id="c1",
                gcs_path="gs://mock/cover.jpg", 
                thumbnail_url="https://placehold.co/600",
                capture_time=datetime.now(), 
                latitude=0, longitude=0, aesthetic_score=0.95,
                quality=PhotoQuality.HIGH, width=1000, height=1000, 
                is_portrait=True, has_faces=False, face_count=0
            ) 
        )

@router.post("/create", response_model=MagicCreateResponse)
async def magic_create(
    request: MagicCreateRequest,
    design_engine: DesignEngine = Depends(get_design_engine)
):
    """
    Unified Magic Create endpoint.
    """
    try:
        start_time = time.time()
        
        # Phase 1 Mocking Curation Engine
        book_generator = MockBookGenerator()
        
        # Convert to GenerateRequest format (mocking the internal curation request)
        class MockCurationRequest:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)
        
        curation_request = MockCurationRequest(
            user_id=request.user_id
        )
        
        curated_book = book_generator.generate(curation_request)
        
        # Convert to dict format for design engine
        curated_data = {
            "pages": [
                {
                    "event_name": page.event_name,
                    "hero_photos": [
                        {
                            "id": photo.id,
                            "gcs_path": photo.gcs_path,
                            "thumbnail_url": photo.thumbnail_url,
                            "aesthetic_score": photo.aesthetic_score,
                            "is_portrait": photo.is_portrait,
                            "has_faces": photo.has_faces,
                            "face_count": photo.face_count
                        }
                        for photo in page.hero_photos
                    ]
                }
                for page in curated_book.pages
            ],
            "cover_photo": {
                "id": curated_book.cover_photo.id,
                "gcs_path": curated_book.cover_photo.gcs_path,
                "thumbnail_url": curated_book.cover_photo.thumbnail_url
            } if curated_book.cover_photo else None
        }
        
        # Phase 2: Design with Gemini
        designed_album = await design_engine.design_album(request, curated_data)
        
        total_time = time.time() - start_time
        
        return MagicCreateResponse(
            success=True,
            album=designed_album,
            estimated_render_time=int(len(designed_album.pages) * 500)
        )
        
    except ValueError as e:
        return MagicCreateResponse(
            success=False,
            error=f"No photos found: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Magic Create failed: {str(e)}"
        )

@router.get("/styles")
async def get_available_styles():
    """Return all available design styles with descriptions."""
    
    style_descriptions = {
        DesignStyle.MINIMAL: "Clean, simple layouts with lots of white space",
        DesignStyle.ELEGANT: "Sophisticated and refined with classic typography",
        DesignStyle.PLAYFUL: "Fun, colorful with dynamic layouts",
        DesignStyle.VINTAGE: "Nostalgic, warm tones with retro elements",
        DesignStyle.MODERN: "Contemporary, bold with geometric accents",
        DesignStyle.RUSTIC: "Natural, earthy with organic textures",
        DesignStyle.ROMANTIC: "Soft, dreamy with flowing elements",
        DesignStyle.BOLD: "High contrast, dramatic compositions",
        DesignStyle.CLASSIC: "Timeless, traditional album aesthetics",
        DesignStyle.WHIMSICAL: "Imaginative, fairy-tale inspired"
    }
    
    return {
        "styles": [
            {"id": style.value, "name": style.name, "description": desc}
            for style, desc in style_descriptions.items()
        ]
    }
