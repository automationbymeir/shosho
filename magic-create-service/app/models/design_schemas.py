
from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum
from datetime import datetime

# ============================================================================
# ENUMS
# ============================================================================

class DesignStyle(str, Enum):
    MINIMAL = "minimal"
    ELEGANT = "elegant"
    PLAYFUL = "playful"
    VINTAGE = "vintage"
    MODERN = "modern"
    RUSTIC = "rustic"
    ROMANTIC = "romantic"
    BOLD = "bold"
    CLASSIC = "classic"
    WHIMSICAL = "whimsical"

class LayoutType(str, Enum):
    SINGLE_HERO = "single_hero"          # 1 large photo
    DOUBLE_STACK = "double_stack"        # 2 photos vertically
    DOUBLE_SIDE = "double_side"          # 2 photos horizontally
    TRIPLE_FEATURE = "triple_feature"    # 1 large + 2 small
    GRID_2X2 = "grid_2x2"               # 4 equal photos
    COLLAGE_FREE = "collage_free"        # Irregular arrangement
    TIMELINE = "timeline"                # Photos with timeline
    FULL_BLEED = "full_bleed"           # Photo covers entire page

class BackgroundType(str, Enum):
    SOLID = "solid"
    GRADIENT = "gradient"
    PATTERN = "pattern"
    TEXTURE = "texture"
    AI_GENERATED = "ai_generated"
    PHOTO_BLUR = "photo_blur"           # Blurred version of a photo

class FrameStyle(str, Enum):
    NONE = "none"
    SIMPLE = "simple"
    ROUNDED = "rounded"
    POLAROID = "polaroid"
    SHADOW = "shadow"
    VINTAGE = "vintage"
    TORN = "torn"
    FILMSTRIP = "filmstrip"
    ORNATE = "ornate"

class TextStyle(str, Enum):
    TITLE = "title"
    SUBTITLE = "subtitle"
    CAPTION = "caption"
    QUOTE = "quote"
    DATE = "date"

# ============================================================================
# COLOR & TYPOGRAPHY
# ============================================================================

class ColorPalette(BaseModel):
    """5-color palette for consistent theming."""
    primary: str = Field(..., description="Main brand color (hex)")
    secondary: str = Field(..., description="Supporting color (hex)")
    accent: str = Field(..., description="Highlight/CTA color (hex)")
    background: str = Field(..., description="Page background (hex)")
    text: str = Field(..., description="Primary text color (hex)")
    
    # Extended palette (optional)
    background_alt: Optional[str] = None
    text_muted: Optional[str] = None

class Typography(BaseModel):
    """Font configuration for the album."""
    title_font: str = Field(default="Playfair Display")
    body_font: str = Field(default="Open Sans")
    accent_font: Optional[str] = Field(default="Great Vibes")
    
    title_size: int = Field(default=48)
    subtitle_size: int = Field(default=24)
    body_size: int = Field(default=16)
    caption_size: int = Field(default=12)
    
    title_weight: str = Field(default="bold")
    body_weight: str = Field(default="normal")

# ============================================================================
# DESIGN ELEMENTS
# ============================================================================

class Position(BaseModel):
    """Position in percentage (0-100) for responsive layouts."""
    x: float = Field(..., ge=0, le=100)
    y: float = Field(..., ge=0, le=100)
    width: float = Field(..., ge=0, le=100)
    height: float = Field(..., ge=0, le=100)
    rotation: float = Field(default=0, ge=-180, le=180)
    z_index: int = Field(default=0)

class Background(BaseModel):
    """Page background configuration."""
    type: BackgroundType
    
    # For solid
    color: Optional[str] = None
    
    # For gradient
    gradient_colors: Optional[list[str]] = None
    gradient_angle: Optional[int] = None
    
    # For pattern/texture
    pattern_name: Optional[str] = None
    pattern_scale: Optional[float] = None
    pattern_opacity: Optional[float] = None
    
    # For AI-generated
    ai_prompt: Optional[str] = None
    ai_image_url: Optional[str] = None
    
    # For photo blur
    source_photo_id: Optional[str] = None
    blur_amount: Optional[int] = None

class Frame(BaseModel):
    """Photo frame configuration."""
    style: FrameStyle
    color: Optional[str] = None
    width: Optional[int] = None  # Border width in px
    radius: Optional[int] = None  # Corner radius in px
    shadow: Optional[dict] = None  # { offsetX, offsetY, blur, color }
    
    # For special frames
    texture_url: Optional[str] = None

class PhotoPlacement(BaseModel):
    """Single photo placement on a page."""
    photo_id: str
    photo_url: str
    thumbnail_url: str
    
    position: Position
    frame: Frame
    
    # Effects
    filter: Optional[str] = None  # CSS filter or preset name
    opacity: float = Field(default=1.0, ge=0, le=1)
    
    # Metadata for display
    caption: Optional[str] = None
    date_overlay: Optional[str] = None

class TextElement(BaseModel):
    """Text overlay element."""
    content: str
    style: TextStyle
    position: Position
    
    font_family: Optional[str] = None
    font_size: Optional[int] = None
    font_weight: Optional[str] = None
    color: Optional[str] = None
    
    alignment: Literal["left", "center", "right"] = "center"
    max_width: Optional[float] = None  # Percentage

class Decoration(BaseModel):
    """Decorative element (stickers, flourishes, etc.)."""
    type: Literal["sticker", "flourish", "icon", "shape", "divider"]
    asset_url: Optional[str] = None
    svg_data: Optional[str] = None
    
    position: Position
    color: Optional[str] = None
    opacity: float = Field(default=1.0)

# ============================================================================
# PAGE & ALBUM
# ============================================================================

class PageLayout(BaseModel):
    """Complete page layout configuration."""
    layout_type: LayoutType
    
    # Grid configuration
    columns: int = Field(default=1, ge=1, le=4)
    rows: int = Field(default=1, ge=1, le=4)
    gap: float = Field(default=2.0)  # Percentage
    padding: float = Field(default=5.0)  # Percentage

class DesignedPage(BaseModel):
    """Fully designed album page."""
    page_number: int
    page_id: str
    
    # From Curation Engine
    event_name: Optional[str] = None
    event_date: Optional[datetime] = None
    
    # Layout
    layout: PageLayout
    background: Background
    
    # Content
    photos: list[PhotoPlacement]
    text_elements: list[TextElement] = []
    decorations: list[Decoration] = []

class AlbumTheme(BaseModel):
    """Overall album theme configuration."""
    theme_id: str
    theme_name: str
    style: DesignStyle
    
    colors: ColorPalette
    typography: Typography
    
    # Default styles
    default_frame: Frame
    default_background: Background
    
    # Theme-specific assets
    cover_template_url: Optional[str] = None
    decoration_pack_url: Optional[str] = None
    
    # Gemini-generated description
    style_description: str
    mood_keywords: list[str]

class DesignedAlbum(BaseModel):
    """Complete designed album ready for rendering."""
    album_id: str
    user_id: str
    
    # User input
    original_prompt: str
    
    # Theme
    theme: AlbumTheme
    
    # Pages
    cover_page: DesignedPage
    pages: list[DesignedPage]
    back_cover: Optional[DesignedPage] = None
    
    # Metadata
    created_at: datetime
    total_photos: int
    
    # Generation info
    gemini_model_used: str
    generation_time_ms: int

# ============================================================================
# API REQUEST/RESPONSE
# ============================================================================

class MagicCreateRequest(BaseModel):
    """Unified request for Magic Create feature."""
    user_id: str
    prompt: str = Field(..., example="Elegant beach wedding with golden sunset tones")
    
    # Optional constraints
    max_pages: int = Field(default=20, ge=1, le=50)
    photos_per_page: int = Field(default=3, ge=1, le=6)
    
    # Style preferences
    preferred_style: Optional[DesignStyle] = None
    color_preference: Optional[str] = None  # e.g., "warm", "cool", "neutral"
    
    # Photo filtering
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    include_faces: Optional[list[str]] = None
    
    # Design options
    include_ai_backgrounds: bool = Field(default=True)
    include_decorations: bool = Field(default=True)
    include_captions: bool = Field(default=True)

class MagicCreateResponse(BaseModel):
    """Response from Magic Create feature."""
    success: bool
    album: Optional[DesignedAlbum] = None
    error: Optional[str] = None
    
    # Preview data for quick rendering
    preview_url: Optional[str] = None
    estimated_render_time: Optional[int] = None
