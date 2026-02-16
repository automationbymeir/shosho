
# app/services/gemini_client.py

import os
import json
import google.generativeai as genai
from typing import Optional, Any
from pydantic import BaseModel
from app.config import get_settings

settings = get_settings()

class GeminiClient:
    """
    Wrapper for Google Gemini API with specialized methods for design generation.
    """
    
    def __init__(self):
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            # Initialize models
            self.flash_model = genai.GenerativeModel(settings.gemini_model_flash)
            self.pro_model = genai.GenerativeModel(settings.gemini_model_pro)
        else:
            print("WARNING: GEMINI_API_KEY not set. GeminiClient will functionality be limited.")
            self.flash_model = None
            self.pro_model = None
        
        # Generation config
        self.design_config = genai.GenerationConfig(
            temperature=0.7,
            top_p=0.9,
            top_k=40,
            max_output_tokens=8192,
        )
        
        self.structured_config = genai.GenerationConfig(
            temperature=0.3,  # Lower for structured output
            top_p=0.8,
            max_output_tokens=4096,
            response_mime_type="application/json"
        )
    
    async def parse_design_intent(self, prompt: str) -> dict:
        """
        Parse user prompt to extract design intent.
        """
        if not self.flash_model:
            return {
                "style": "modern",
                "mood_keywords": ["clean", "simple"],
                "color_preference": "neutral",
                "event_type": "general", 
                "special_requests": None
            }

        system_prompt = """You are a design intent parser for a photo album app.
        
Analyze the user's prompt and extract:
1. Primary style (minimal, elegant, playful, vintage, modern, rustic, romantic, bold, classic, whimsical)
2. Mood keywords (3-5 words describing the feeling)
3. Color suggestions (warm/cool/neutral preference, specific colors mentioned)
4. Event type (wedding, travel, birthday, family, baby, graduation, etc.)
5. Season/time hints (summer, winter, sunset, night, etc.)
6. Special requests (any specific design elements mentioned)

Return as JSON with keys: style, mood_keywords, color_preference, color_suggestions, event_type, season_hints, special_requests"""

        response = await self.flash_model.generate_content_async(
            [system_prompt, f"User prompt: {prompt}"],
            generation_config=self.structured_config
        )
        
        return json.loads(response.text)
    
    async def generate_theme(
        self, 
        design_intent: dict,
        sample_photos_description: Optional[str] = None
    ) -> dict:
        """
        Generate complete album theme based on design intent.
        """
        if not self.pro_model:
            # Return mock theme if API not available
            return {
                "color_palette": {
                    "primary": "#333333", "secondary": "#666666", "accent": "#007AFF", 
                    "background": "#FFFFFF", "text": "#000000"
                },
                "typography": {"title_font": "Roboto", "body_font": "Open Sans"},
                "default_frame": {"style": "simple", "color": "#000000", "width": 1},
                "default_background": {"type": "solid", "color": "#FFFFFF"},
                "style_description": "Mock Theme",
                "decoration_suggestions": []
            }

        system_prompt = """You are an expert album designer. Create a cohesive design theme.

Based on the design intent provided, generate:

1. color_palette:
   - primary: Main color (hex)
   - secondary: Supporting color (hex)  
   - accent: Highlight color (hex)
   - background: Page background (hex)
   - text: Text color (hex)

2. typography:
   - title_font: Google Font name for titles
   - body_font: Google Font name for body text
   - accent_font: Decorative font for special text (optional)

3. default_frame:
   - style: none/simple/rounded/polaroid/shadow/vintage/torn/filmstrip/ornate
   - color: Frame color if applicable (hex)
   - width: Border width (1-10)
   - radius: Corner radius (0-30)

4. default_background:
   - type: solid/gradient/pattern/texture
   - For gradient: colors array and angle
   - For pattern: pattern_name (dots, stripes, chevron, floral, geometric)

5. style_description: 2-3 sentence description of the overall aesthetic

6. decoration_suggestions: Array of decoration types that fit (flourishes, botanicals, geometric, vintage_stamps, polaroid_tape, etc.)

Return as valid JSON."""

        photo_context = ""
        if sample_photos_description:
            photo_context = f"\n\nPhoto context: {sample_photos_description}"

        response = await self.pro_model.generate_content_async(
            [
                system_prompt,
                f"Design intent: {json.dumps(design_intent)}{photo_context}"
            ],
            generation_config=self.structured_config
        )
        
        return json.loads(response.text)
    
    async def generate_page_layout(
        self,
        photos: list[dict],
        theme: dict,
        page_number: int,
        event_context: Optional[str] = None
    ) -> dict:
        """
        Generate optimal layout for a page based on photo characteristics.
        """
        if not self.pro_model:
            # Mock layout response
            return {
                "layout_type": "grid_2x2" if len(photos) > 1 else "single_hero",
                "photo_positions": [
                    {"photo_index": i, "x": (i%2)*50, "y": (i//2)*50, "width": 45, "height": 45}
                    for i in range(len(photos))
                ],
                "recommended_frame_style": None,
                "background_suggestion": None
            }

        system_prompt = """You are an expert photo album layout designer.

Given a set of photos and their characteristics, Determine the optimal layout.

Photo characteristics provided:
- is_portrait: true/false
- has_faces: true/false
- face_count: number
- aesthetic_score: 0-1 (higher = better quality)

Rules:
1. High aesthetic_score photos should be featured prominently (larger)
2. Photos with faces should not be cropped awkwardly
3. Mix of portrait/landscape affects grid choices
4. Vary layouts throughout album (check page_number)
5. Group photos tell a story - consider temporal order

Return JSON with:
1. layout_type: single_hero/double_stack/double_side/triple_feature/grid_2x2/collage_free/timeline/full_bleed
2. photo_positions: Array of position objects for each photo:
   - photo_index: which photo (0-indexed)
   - x, y, width, height: percentages (0-100)
   - rotation: degrees (-15 to 15 for slight tilt, 0 for straight)
   - is_hero: boolean (featured photo)
3. recommended_frame_style: Override frame if needed for this layout
4. background_suggestion: Any page-specific background adjustment"""

        response = await self.pro_model.generate_content_async(
            [
                system_prompt,
                f"""Theme: {json.dumps(theme)}
Page number: {page_number}
Event: {event_context or 'General'}
Photos: {json.dumps(photos)}"""
            ],
            generation_config=self.structured_config
        )
        
        return json.loads(response.text)
    
    async def generate_captions(
        self,
        photos: list[dict],
        event_context: str,
        theme_mood: list[str]
    ) -> list[str]:
        if not self.flash_model:
            return ["Sample Caption" for _ in photos]

        system_prompt = f"""Generate short, evocative captions for photo album pages.

Style: {', '.join(theme_mood)}
Keep captions to 3-8 words each. They should:
- Capture the moment's emotion
- Match the album's mood
- Not be generic or cliché

Return as JSON array of strings, one per photo."""

        response = await self.flash_model.generate_content_async(
            [
                system_prompt,
                f"Event: {event_context}\nPhotos: {json.dumps(photos)}"
            ],
            generation_config=self.structured_config
        )
        
        return json.loads(response.text)
    
    async def generate_background_prompt(
        self,
        theme: dict,
        page_context: str
    ) -> str:
        if not self.flash_model:
            return "Subtle background"

        system_prompt = """Create an image generation prompt for a photo album page background.

The background should:
- Be subtle and not distract from photos
- Use soft, muted versions of the theme colors
- Have gentle textures or patterns
- Work as a backdrop, not a focal point

Return ONLY the image generation prompt, no JSON."""

        response = await self.flash_model.generate_content_async(
            [
                system_prompt,
                f"Theme colors: {json.dumps(theme.get('color_palette', {}))}\n"
                f"Style: {theme.get('style_description', '')}\n"
                f"Page context: {page_context}"
            ],
            generation_config=genai.GenerationConfig(
                temperature=0.8,
                max_output_tokens=200
            )
        )
        
        return response.text.strip()
    
    async def suggest_decorations(
        self,
        theme: dict,
        page_photos: list[dict],
        existing_decorations_used: list[str]
    ) -> list[dict]:
        if not self.flash_model:
            return []

        system_prompt = """Suggest decorative elements for a photo album page.

Available decoration types:
- flourish: Elegant curved lines/swirls
- botanical: Leaves, flowers, branches
- geometric: Shapes, lines, dots
- vintage_stamp: Postage stamp style elements  
- tape: Washi tape, photo corners
- ribbon: Ribbon accents
- icon: Small themed icons
- divider: Page dividers

For each suggestion, provide:
- type: from list above
- position_hint: "top-left", "bottom-right", "corner", "edge", etc.
- color_suggestion: Use theme colors or null for default
- scale: small/medium/large

Return JSON array. Suggest 0-3 decorations. Less is more - don't over-decorate."""

        response = await self.flash_model.generate_content_async(
            [
                system_prompt,
                f"""Theme style: {theme.get('style_description', '')}
Theme colors: {json.dumps(theme.get('color_palette', {}))}
Photos on page: {len(page_photos)}
Already used in album: {existing_decorations_used}"""
            ],
            generation_config=self.structured_config
        )
        
        return json.loads(response.text)
