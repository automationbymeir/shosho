
import sys
import os
from datetime import datetime

# Add the parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from app.models.design_schemas import (
        DesignedAlbum, DesignedPage, AlbumTheme, ColorPalette, Typography,
        Frame, Background, PageLayout, DesignStyle, BackgroundType, FrameStyle, LayoutType
    )
    print("SUCCESS: Modules imported successfully.")
except ImportError as e:
    print(f"ERROR: Import failed: {e}")
    sys.exit(1)

def verify_design_schema():
    print("Verifying schema instantiation...")
    try:
        colors = ColorPalette(
            primary="#000000", secondary="#FFFFFF", accent="#FF0000",
            background="#CCCCCC", text="#111111"
        )
        typography = Typography()
        theme = AlbumTheme(
            theme_id="test_theme", theme_name="Test", style=DesignStyle.MODERN,
            colors=colors, typography=typography,
            default_frame=Frame(style=FrameStyle.SIMPLE),
            default_background=Background(type=BackgroundType.SOLID),
            style_description="Test Description", mood_keywords=["test"]
        )
        
        page = DesignedPage(
            page_number=1, page_id="p1",
            layout=PageLayout(layout_type=LayoutType.SINGLE_HERO),
            background=Background(type=BackgroundType.SOLID),
            photos=[]
        )
        
        album = DesignedAlbum(
            album_id="a1", user_id="u1", original_prompt="test",
            theme=theme, cover_page=page, pages=[page],
            created_at=datetime.now(), total_photos=0,
            gemini_model_used="test", generation_time_ms=0
        )
        print("SUCCESS: DesignedAlbum instantiated correctly.")
        print(f"Album ID: {album.album_id}")
    except Exception as e:
        print(f"ERROR: Schema verification failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify_design_schema()
