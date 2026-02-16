
# app/services/design_engine.py

import uuid
import asyncio
from datetime import datetime
from typing import Optional

from app.services.gemini_client import GeminiClient
from app.services.imagen_client import ImagenClient
from app.models.design_schemas import (
    DesignedAlbum, DesignedPage, AlbumTheme, PageLayout, PhotoPlacement,
    Background, Frame, TextElement, Decoration, Position, ColorPalette,
    Typography, DesignStyle, LayoutType, BackgroundType, FrameStyle,
    MagicCreateRequest, TextStyle
)
from app.config import get_settings

settings = get_settings()

class DesignEngine:
    """
    Main design engine that orchestrates Gemini-based album design.
    """
    
    def __init__(self):
        self.gemini = GeminiClient()
        self.imagen = ImagenClient()
        self._decoration_cache = {}
    
    async def design_album(
        self,
        request: MagicCreateRequest,
        curated_photos: dict  # Output from Curation Engine
    ) -> DesignedAlbum:
        """
        Main entry point: Design complete album from curated photos.
        """
        start_time = datetime.now()
        
        # Step 1: Parse design intent from prompt
        design_intent = await self.gemini.parse_design_intent(request.prompt)
        
        # Override style if user specified preference
        if request.preferred_style:
            design_intent['style'] = request.preferred_style.value
        
        # Step 2: Generate cohesive theme
        sample_description = self._describe_photos(curated_photos)
        theme_data = await self.gemini.generate_theme(design_intent, sample_description)
        
        theme = self._build_theme(
            theme_data, 
            design_intent,
            request.prompt
        )
        
        # Step 3: Design each page
        designed_pages = []
        decorations_used = []
        
        for page_idx, page_data in enumerate(curated_photos.get('pages', [])):
            designed_page = await self._design_page(
                page_data=page_data,
                theme=theme,
                page_number=page_idx + 1,
                include_ai_backgrounds=request.include_ai_backgrounds,
                include_decorations=request.include_decorations,
                include_captions=request.include_captions,
                decorations_used=decorations_used
            )
            designed_pages.append(designed_page)
        
        # Step 4: Design cover page
        cover_page = await self._design_cover(
            curated_photos.get('cover_photo'),
            theme,
            request.prompt
        )
        
        # Calculate generation time
        generation_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return DesignedAlbum(
            album_id=str(uuid.uuid4()),
            user_id=request.user_id,
            original_prompt=request.prompt,
            theme=theme,
            cover_page=cover_page,
            pages=designed_pages,
            back_cover=None,  # Optional: design back cover
            created_at=datetime.now(),
            total_photos=sum(len(p.photos) for p in designed_pages),
            gemini_model_used="gemini-2.5-pro + gemini-2.5-flash",
            generation_time_ms=generation_time
        )
    
    def _describe_photos(self, curated_photos: dict) -> str:
        """Create text description of photos for context."""
        pages = curated_photos.get('pages', [])
        if not pages:
            return ""
        
        descriptions = []
        for page in pages[:3]:  # Sample first 3 pages
            event_name = page.get('event_name', 'Unknown event')
            photo_count = len(page.get('hero_photos', []))
            descriptions.append(f"{event_name} ({photo_count} photos)")
        
        return f"Album contains {len(pages)} events including: {', '.join(descriptions)}"
    
    def _build_theme(
        self, 
        theme_data: dict, 
        design_intent: dict, 
        original_prompt: str
    ) -> AlbumTheme:
        """Convert Gemini response to AlbumTheme model."""
        
        # Parse color palette
        palette_data = theme_data.get('color_palette', {})
        colors = ColorPalette(
            primary=palette_data.get('primary', '#2C3E50'),
            secondary=palette_data.get('secondary', '#3498DB'),
            accent=palette_data.get('accent', '#E74C3C'),
            background=palette_data.get('background', '#FFFFFF'),
            text=palette_data.get('text', '#2C3E50')
        )
        
        # Parse typography
        typo_data = theme_data.get('typography', {})
        typography = Typography(
            title_font=typo_data.get('title_font', 'Playfair Display'),
            body_font=typo_data.get('body_font', 'Open Sans'),
            accent_font=typo_data.get('accent_font', 'Great Vibes')
        )
        
        # Parse default frame
        frame_data = theme_data.get('default_frame', {})
        default_frame = Frame(
            style=FrameStyle(frame_data.get('style', 'simple')),
            color=frame_data.get('color'),
            width=frame_data.get('width', 2),
            radius=frame_data.get('radius', 0)
        )
        
        # Parse default background
        bg_data = theme_data.get('default_background', {})
        bg_type = bg_data.get('type', 'solid')
        default_background = Background(
            type=BackgroundType(bg_type),
            color=colors.background if bg_type == 'solid' else None,
            gradient_colors=bg_data.get('colors') if bg_type == 'gradient' else None,
            gradient_angle=bg_data.get('angle', 180) if bg_type == 'gradient' else None,
            pattern_name=bg_data.get('pattern_name') if bg_type == 'pattern' else None
        )
        
        # Determine style enum
        style_str = design_intent.get('style', 'modern')
        try:
            style = DesignStyle(style_str.lower())
        except ValueError:
            style = DesignStyle.MODERN
        
        return AlbumTheme(
            theme_id=str(uuid.uuid4()),
            theme_name=f"Custom Theme - {original_prompt[:30]}",
            style=style,
            colors=colors,
            typography=typography,
            default_frame=default_frame,
            default_background=default_background,
            style_description=theme_data.get('style_description', ''),
            mood_keywords=design_intent.get('mood_keywords', [])
        )
    
    async def _design_page(
        self,
        page_data: dict,
        theme: AlbumTheme,
        page_number: int,
        include_ai_backgrounds: bool,
        include_decorations: bool,
        include_captions: bool,
        decorations_used: list
    ) -> DesignedPage:
        """Design a single page with layout, background, and decorations."""
        
        photos = page_data.get('hero_photos', [])
        event_name = page_data.get('event_name', '')
        
        # Convert photos to metadata format for Gemini
        photo_metadata = [
            {
                'is_portrait': p.get('is_portrait', False),
                'has_faces': p.get('has_faces', False),
                'face_count': p.get('face_count', 0),
                'aesthetic_score': p.get('aesthetic_score', 0.5)
            }
            for p in photos
        ]
        
        # Get layout from Gemini
        layout_response = await self.gemini.generate_page_layout(
            photos=photo_metadata,
            theme=theme.model_dump(),
            page_number=page_number,
            event_context=event_name
        )
        
        # Build layout config
        layout_type_str = layout_response.get('layout_type', 'grid_2x2')
        try:
            layout_type = LayoutType(layout_type_str)
        except ValueError:
            layout_type = LayoutType.GRID_2X2
        
        layout = PageLayout(
            layout_type=layout_type,
            columns=self._get_columns_for_layout(layout_type),
            rows=self._get_rows_for_layout(layout_type),
            gap=2.0,
            padding=5.0
        )
        
        # Build photo placements
        photo_positions = layout_response.get('photo_positions', [])
        placements = []
        
        for i, photo in enumerate(photos):
            pos_data = photo_positions[i] if i < len(photo_positions) else {}
            
            # Use Gemini's position or calculate default
            position = Position(
                x=pos_data.get('x', (i % 2) * 50),
                y=pos_data.get('y', (i // 2) * 50),
                width=pos_data.get('width', 45),
                height=pos_data.get('height', 45),
                rotation=pos_data.get('rotation', 0),
                z_index=i
            )
            
            # Determine frame
            frame_override = layout_response.get('recommended_frame_style')
            frame = Frame(
                style=FrameStyle(frame_override) if frame_override else theme.default_frame.style,
                color=theme.default_frame.color,
                width=theme.default_frame.width,
                radius=theme.default_frame.radius
            )
            
            placements.append(PhotoPlacement(
                photo_id=photo.get('id', str(uuid.uuid4())),
                photo_url=photo.get('gcs_path', ''),
                thumbnail_url=photo.get('thumbnail_url', ''),
                position=position,
                frame=frame
            ))
        
        # Generate background
        background = theme.default_background
        if include_ai_backgrounds and page_number % 3 == 0:  # AI background every 3rd page
            bg_prompt = await self.gemini.generate_background_prompt(
                theme.model_dump(),
                event_name
            )
            ai_image = await self.imagen.generate_background(bg_prompt)
            if ai_image:
                background = Background(
                    type=BackgroundType.AI_GENERATED,
                    ai_prompt=bg_prompt,
                    ai_image_url=f"data:image/png;base64,{ai_image}"
                )
        
        # Generate decorations
        decorations = []
        if include_decorations:
            deco_suggestions = await self.gemini.suggest_decorations(
                theme.model_dump(),
                photo_metadata,
                decorations_used
            )
            decorations = self._build_decorations(deco_suggestions, theme)
            decorations_used.extend([d.type for d in decorations])
        
        # Generate captions
        text_elements = []
        if include_captions and event_name:
            text_elements.append(TextElement(
                content=event_name,
                style=TextStyle.TITLE if page_number == 1 else TextStyle.SUBTITLE,
                position=Position(x=50, y=90, width=80, height=10),
                font_family=theme.typography.title_font,
                color=theme.colors.text,
                alignment="center"
            ))
        
        return DesignedPage(
            page_number=page_number,
            page_id=str(uuid.uuid4()),
            event_name=event_name,
            layout=layout,
            background=background,
            photos=placements,
            text_elements=text_elements,
            decorations=decorations
        )
    
    async def _design_cover(
        self,
        cover_photo: dict,
        theme: AlbumTheme,
        prompt: str
    ) -> DesignedPage:
        """Design the album cover page."""
        
        # Cover uses full-bleed layout with single hero
        layout = PageLayout(
            layout_type=LayoutType.FULL_BLEED,
            columns=1,
            rows=1,
            gap=0,
            padding=0
        )
        
        full_bleed_width = 100
        full_bleed_height = 100
        
        if cover_photo:
            photo_placement = PhotoPlacement(
                photo_id=cover_photo.get('id', str(uuid.uuid4())),
                photo_url=cover_photo.get('gcs_path', ''),
                thumbnail_url=cover_photo.get('thumbnail_url', ''),
                position=Position(x=0, y=0, width=full_bleed_width, height=full_bleed_height),
                frame=Frame(style=FrameStyle.NONE),
                filter="brightness(0.8)"  # Slight darken for text readability
            )
            photos = [photo_placement]
        else:
            photos = []
        
        # Title text
        title_text = TextElement(
            content=self._generate_cover_title(prompt),
            style=TextStyle.TITLE,
            position=Position(x=50, y=80, width=90, height=15),
            font_family=theme.typography.accent_font or theme.typography.title_font,
            font_size=56,
            color="#FFFFFF",
            alignment="center"
        )
        
        return DesignedPage(
            page_number=0,
            page_id=str(uuid.uuid4()),
            event_name="Cover",
            layout=layout,
            background=Background(type=BackgroundType.SOLID, color="#000000"),
            photos=photos,
            text_elements=[title_text],
            decorations=[]
        )
    
    def _generate_cover_title(self, prompt: str) -> str:
        """Extract or generate a title from the prompt."""
        # Simple extraction - could be enhanced with Gemini
        words = prompt.split()
        if len(words) <= 4:
            return prompt.title()
        
        # Extract key phrases
        key_words = [w for w in words if w[0].isupper() or len(w) > 5]
        if key_words:
            return " ".join(key_words[:4]).title()
        
        return " ".join(words[:4]).title()
    
    def _get_columns_for_layout(self, layout_type: LayoutType) -> int:
        """Get column count for layout type."""
        mapping = {
            LayoutType.SINGLE_HERO: 1,
            LayoutType.DOUBLE_STACK: 1,
            LayoutType.DOUBLE_SIDE: 2,
            LayoutType.TRIPLE_FEATURE: 2,
            LayoutType.GRID_2X2: 2,
            LayoutType.COLLAGE_FREE: 2,
            LayoutType.TIMELINE: 1,
            LayoutType.FULL_BLEED: 1
        }
        return mapping.get(layout_type, 2)
    
    def _get_rows_for_layout(self, layout_type: LayoutType) -> int:
        """Get row count for layout type."""
        mapping = {
            LayoutType.SINGLE_HERO: 1,
            LayoutType.DOUBLE_STACK: 2,
            LayoutType.DOUBLE_SIDE: 1,
            LayoutType.TRIPLE_FEATURE: 2,
            LayoutType.GRID_2X2: 2,
            LayoutType.COLLAGE_FREE: 2,
            LayoutType.TIMELINE: 3,
            LayoutType.FULL_BLEED: 1
        }
        return mapping.get(layout_type, 2)
    
    def _build_decorations(
        self, 
        suggestions: list[dict],
        theme: AlbumTheme
    ) -> list[Decoration]:
        """Convert decoration suggestions to Decoration models."""
        decorations = []
        
        position_map = {
            "top-left": Position(x=5, y=5, width=15, height=15),
            "top-right": Position(x=80, y=5, width=15, height=15),
            "bottom-left": Position(x=5, y=80, width=15, height=15),
            "bottom-right": Position(x=80, y=80, width=15, height=15),
            "corner": Position(x=85, y=85, width=10, height=10),
            "edge": Position(x=0, y=50, width=5, height=30),
        }
        
        for sug in suggestions[:3]:  # Max 3 decorations
            pos_hint = sug.get('position_hint', 'corner')
            position = position_map.get(pos_hint, position_map['corner'])
            
            decorations.append(Decoration(
                type=sug.get('type', 'flourish'),
                position=position,
                color=sug.get('color_suggestion') or theme.colors.accent,
                opacity=0.7
            ))
        
        return decorations
