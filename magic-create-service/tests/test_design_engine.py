
import pytest
import os
import sys
from unittest.mock import AsyncMock, patch

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.design_engine import DesignEngine
from app.models.design_schemas import MagicCreateRequest, DesignedAlbum

@pytest.fixture
def mock_gemini_responses():
    return {
        "parse_design_intent": {
            "style": "romantic",
            "mood_keywords": ["dreamy", "soft"],
            "color_preference": "warm",
            "event_type": "wedding",
            "season_hints": ["summer"]
        },
        "generate_theme": {
            "color_palette": {
                "primary": "#8B4513", "secondary": "#DEB887", "accent": "#FFD700",
                "background": "#FFF8DC", "text": "#2F1810"
            },
            "typography": {"title_font": "Great Vibes", "body_font": "Lato"},
            "default_frame": {"style": "simple", "color": "#8B4513", "width": 2},
            "default_background": {"type": "gradient", "colors": ["#FFF8DC", "#FFE4B5"]},
            "style_description": "Romantic, warm sunset tones"
        },
        "generate_page_layout": {
            "layout_type": "triple_feature",
            "photo_positions": [
                {"photo_index": 0, "x": 5, "y": 5, "width": 55, "height": 60, "is_hero": True}
            ]
        }
    }

@pytest.fixture
def sample_curated_photos():
    return {
        "pages": [
            {
                "event_name": "Beach Ceremony",
                "hero_photos": [
                    {
                        "id": "photo1", "gcs_path": "gs://bucket/photo1.jpg",
                        "thumbnail_url": "https://example.com/t1.jpg",
                        "aesthetic_score": 0.9, "is_portrait": False,
                        "has_faces": True, "face_count": 2
                    }
                ]
            }
        ],
        "cover_photo": {
            "id": "cover1", "gcs_path": "gs://bucket/cover.jpg",
            "thumbnail_url": "https://example.com/c1.jpg"
        }
    }

@pytest.mark.asyncio
async def test_design_engine_generates_album(mock_gemini_responses, sample_curated_photos):
    # Mock GeminiClient methods
    with patch('app.services.design_engine.GeminiClient') as MockGeminiClient:
        # Configure the mock instance
        mock_gemini = MockGeminiClient.return_value
        mock_gemini.parse_design_intent = AsyncMock(return_value=mock_gemini_responses["parse_design_intent"])
        mock_gemini.generate_theme = AsyncMock(return_value=mock_gemini_responses["generate_theme"])
        mock_gemini.generate_page_layout = AsyncMock(return_value=mock_gemini_responses["generate_page_layout"])
        mock_gemini.generate_background_prompt = AsyncMock(return_value="A beautiful sunset")
        mock_gemini.suggest_decorations = AsyncMock(return_value=[])
        
        # Mock ImagenClient
        with patch('app.services.design_engine.ImagenClient') as MockImagenClient:
             mock_imagen = MockImagenClient.return_value
             mock_imagen.generate_background = AsyncMock(return_value="fake_base64_image")
             
             engine = DesignEngine()
             
             request = MagicCreateRequest(
                 user_id="test_user",
                 prompt="Romantic beach wedding",
                 max_pages=10
             )
             
             album = await engine.design_album(request, sample_curated_photos)
             
             assert isinstance(album, DesignedAlbum)
             assert album.user_id == "test_user"
             assert len(album.pages) == 1
             assert album.cover_page is not None
             print("\nSUCCESS: DesignEngine generated a valid album")
