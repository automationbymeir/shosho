"""
Magic Create API v4 - Enhanced with AI Backgrounds, Themed Text & Trash Detection
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import os
import uuid
import base64
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()

# Optional vision imports
try:
    import cv2
    import numpy as np
    from PIL import Image
    import requests
    VISION_AVAILABLE = True
except ImportError:
    VISION_AVAILABLE = False
    print("⚠ Vision libraries not installed. Trash detection disabled.")
    print("  Install with: pip install opencv-python-headless numpy Pillow requests")

app = FastAPI(title="Magic Create API v4")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# GEMINI SETUP
# =============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
model = None
MODEL_NAME = None

if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        
        for model_name in ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-1.5-pro-latest", "gemini-2.5-flash"]:
            try:
                test_model = genai.GenerativeModel(model_name)
                test_model.generate_content("test")
                model = test_model
                MODEL_NAME = model_name
                print(f"✓ Gemini model: {MODEL_NAME}")
                break
            except Exception as e:
                print(f"✗ {model_name}: {str(e)[:40]}")
    except ImportError:
        print("⚠ google-generativeai not installed")
else:
    print("⚠ GEMINI_API_KEY not set")


# =============================================================================
# DATA MODELS
# =============================================================================

class PhotoInput(BaseModel):
    id: str
    url: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    rawBaseUrl: Optional[str] = None
    name: Optional[str] = None

class TrashPhotoResult(BaseModel):
    id: str
    url: str
    reason: str
    score: float
    details: str

class AnalyzePhotosRequest(BaseModel):
    photos: List[PhotoInput]

class AnalyzePhotosResponse(BaseModel):
    valid_photos: List[PhotoInput]
    trash_photos: List[TrashPhotoResult]
    analysis_available: bool

class MagicCreateRequest(BaseModel):
    user_id: str
    prompt: str
    photos: List[PhotoInput]
    max_pages: int = 10
    photos_per_page: int = 3
    include_ai_backgrounds: bool = True
    include_decorative_text: bool = True


# =============================================================================
# TRASH PHOTO DETECTION
# =============================================================================

class PhotoAnalyzer:
    BLUR_THRESHOLD = 100
    DARK_THRESHOLD = 50
    BRIGHT_THRESHOLD = 240
    DUPLICATE_THRESHOLD = 5
    
    def __init__(self):
        self.seen_hashes = {}
    
    def analyze_photo(self, photo: PhotoInput) -> Optional[TrashPhotoResult]:
        if not VISION_AVAILABLE:
            return None
        
        try:
            url = photo.thumbnailUrl or photo.url
            if not url or url.startswith('data:'):
                if photo.rawBaseUrl:
                    url = photo.rawBaseUrl + "=w400-h400"
                else:
                    return None
            
            response = requests.get(url, timeout=5)
            if response.status_code != 200:
                return None
            
            img_array = np.frombuffer(response.content, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            if img is None:
                return None
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Blur check
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            if blur_score < self.BLUR_THRESHOLD:
                return TrashPhotoResult(
                    id=photo.id, url=url, reason="blurry",
                    score=blur_score / self.BLUR_THRESHOLD,
                    details=f"Blurry (sharpness: {blur_score:.0f}, min: {self.BLUR_THRESHOLD})"
                )
            
            # Brightness check
            mean_brightness = np.mean(gray)
            if mean_brightness < self.DARK_THRESHOLD:
                return TrashPhotoResult(
                    id=photo.id, url=url, reason="too_dark",
                    score=mean_brightness / 255,
                    details=f"Too dark (brightness: {mean_brightness:.0f}/255)"
                )
            if mean_brightness > self.BRIGHT_THRESHOLD:
                return TrashPhotoResult(
                    id=photo.id, url=url, reason="too_bright",
                    score=1 - (mean_brightness / 255),
                    details=f"Overexposed (brightness: {mean_brightness:.0f}/255)"
                )
            
            # Duplicate check
            pil_img = Image.open(BytesIO(response.content))
            img_hash = self._phash(pil_img)
            
            for other_id, other_hash in self.seen_hashes.items():
                if other_id != photo.id:
                    dist = sum(c1 != c2 for c1, c2 in zip(img_hash, other_hash))
                    if dist < self.DUPLICATE_THRESHOLD:
                        return TrashPhotoResult(
                            id=photo.id, url=url, reason="duplicate",
                            score=dist / 64,
                            details=f"Similar to another photo"
                        )
            
            self.seen_hashes[photo.id] = img_hash
            return None
            
        except Exception as e:
            print(f"[Analyzer] Error: {e}")
            return None
    
    def _phash(self, img: Image.Image, size: int = 8) -> str:
        img = img.convert('L').resize((size + 1, size), Image.Resampling.LANCZOS)
        pixels = list(img.getdata())
        diff = []
        for row in range(size):
            for col in range(size):
                diff.append(pixels[row * (size + 1) + col] > pixels[row * (size + 1) + col + 1])
        return ''.join(['1' if b else '0' for b in diff])


# =============================================================================
# SVG BACKGROUNDS
# =============================================================================

SVG_BACKGROUNDS = {
    "mountains": '''<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
<stop offset="0%" style="stop-color:{color1};stop-opacity:0.3"/>
<stop offset="100%" style="stop-color:{color2};stop-opacity:0.1"/></linearGradient></defs>
<rect width="400" height="300" fill="url(#sky)"/>
<path d="M0 250 L80 150 L120 180 L200 100 L280 160 L320 130 L400 200 L400 300 L0 300 Z" fill="{color1}" opacity="0.15"/>
<path d="M0 280 L100 200 L150 220 L250 150 L350 210 L400 180 L400 300 L0 300 Z" fill="{color1}" opacity="0.1"/>
<circle cx="350" cy="50" r="25" fill="{accent}" opacity="0.2"/></svg>''',

    "beach": '''<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="ocean" x1="0%" y1="0%" x2="0%" y2="100%">
<stop offset="0%" style="stop-color:{color1};stop-opacity:0.2"/>
<stop offset="100%" style="stop-color:{color2};stop-opacity:0.05"/></linearGradient></defs>
<rect width="400" height="300" fill="url(#ocean)"/>
<path d="M0 200 Q50 190 100 200 T200 200 T300 200 T400 200 L400 220 Q350 230 300 220 T200 220 T100 220 T0 220 Z" fill="{color1}" opacity="0.15"/>
<path d="M0 230 Q50 220 100 230 T200 230 T300 230 T400 230 L400 250 Q350 260 300 250 T200 250 T100 250 T0 250 Z" fill="{color1}" opacity="0.1"/>
<circle cx="60" cy="60" r="30" fill="{accent}" opacity="0.25"/></svg>''',

    "wedding": '''<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
<defs><pattern id="hearts" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
<path d="M20 10 C15 5 5 5 5 15 C5 25 20 30 20 30 C20 30 35 25 35 15 C35 5 25 5 20 10 Z" fill="{accent}" opacity="0.08"/></pattern></defs>
<rect width="400" height="300" fill="{background}"/>
<rect width="400" height="300" fill="url(#hearts)"/>
<circle cx="50" cy="50" r="80" fill="{color1}" opacity="0.05"/>
<circle cx="350" cy="250" r="100" fill="{color1}" opacity="0.05"/></svg>''',

    "baby": '''<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
<defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
<circle cx="10" cy="10" r="3" fill="{color1}" opacity="0.15"/></pattern>
<pattern id="stars" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
<polygon points="25,5 30,20 45,20 33,30 38,45 25,35 12,45 17,30 5,20 20,20" fill="{accent}" opacity="0.1"/></pattern></defs>
<rect width="400" height="300" fill="{background}"/>
<rect width="400" height="300" fill="url(#dots)"/>
<rect width="400" height="300" fill="url(#stars)"/></svg>''',

    "nature": '''<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
<defs><pattern id="leaves" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
<path d="M30 10 Q40 20 30 40 Q20 20 30 10 Z" fill="{color1}" opacity="0.1" transform="rotate(15 30 30)"/>
<path d="M15 35 Q25 45 15 55 Q5 45 15 35 Z" fill="{color1}" opacity="0.08" transform="rotate(-20 15 45)"/></pattern></defs>
<rect width="400" height="300" fill="{background}"/>
<rect width="400" height="300" fill="url(#leaves)"/></svg>''',

    "travel": '''<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
<defs><pattern id="compass" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
<circle cx="50" cy="50" r="20" stroke="{color1}" stroke-width="1" fill="none" opacity="0.1"/>
<line x1="50" y1="25" x2="50" y2="35" stroke="{color1}" stroke-width="1" opacity="0.15"/>
<line x1="50" y1="65" x2="50" y2="75" stroke="{color1}" stroke-width="1" opacity="0.15"/>
<line x1="25" y1="50" x2="35" y2="50" stroke="{color1}" stroke-width="1" opacity="0.15"/>
<line x1="65" y1="50" x2="75" y2="50" stroke="{color1}" stroke-width="1" opacity="0.15"/></pattern></defs>
<rect width="400" height="300" fill="{background}"/>
<rect width="400" height="300" fill="url(#compass)"/></svg>''',

    "default": '''<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="subtle" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" style="stop-color:{color1};stop-opacity:0.05"/>
<stop offset="100%" style="stop-color:{color2};stop-opacity:0.02"/></linearGradient></defs>
<rect width="400" height="300" fill="{background}"/>
<rect width="400" height="300" fill="url(#subtle)"/>
<circle cx="350" cy="250" r="150" fill="{color1}" opacity="0.03"/></svg>'''
}

DECORATIVE_TEXTS = {
    "mountains": ["Adventure Awaits", "Touch the Sky", "Peak Moments", "Reach New Heights", "Wild & Free"],
    "beach": ["Sun, Sand & Sea", "Ocean Breeze", "Vitamin Sea", "Seaside Memories", "Waves of Joy"],
    "wedding": ["Forever Begins", "Two Hearts, One Love", "Happily Ever After", "Written in the Stars"],
    "baby": ["Little Miracle", "Sweet Dreams", "Bundle of Joy", "Precious Moments", "Growing Up"],
    "nature": ["Into the Wild", "Nature's Beauty", "Bloom Where Planted", "Forest Dreams"],
    "travel": ["Wanderlust", "Adventure Calls", "Explore More", "Collect Moments", "New Horizons"],
    "family": ["Together is Best", "Family is Everything", "Making Memories", "Forever Family"],
    "default": ["Cherished Moments", "Memories to Keep", "The Story of Us", "Days to Remember"]
}

THEME_PRESETS = {
    "mountains": {
        "style": "modern", "frameId": "shadow",
        "colors": {"primary": "#2D5016", "secondary": "#8CB369", "accent": "#F4A259", "background": "#F7F7F7", "text": "#1A1A1A"},
        "fonts": {"title": "Montserrat", "body": "Source Sans Pro", "accent": "Caveat"},
        "title": "Mountain Adventure", "subtitle": "Reaching New Heights"
    },
    "beach": {
        "style": "playful", "frameId": "rounded",
        "colors": {"primary": "#0077B6", "secondary": "#90E0EF", "accent": "#FFB703", "background": "#CAF0F8", "text": "#03045E"},
        "fonts": {"title": "Pacifico", "body": "Open Sans", "accent": "Dancing Script"},
        "title": "Beach Memories", "subtitle": "Sun, Sand & Sea"
    },
    "wedding": {
        "style": "romantic", "frameId": "simple-white",
        "colors": {"primary": "#B76E79", "secondary": "#F4E8E9", "accent": "#D4AF37", "background": "#FFF5F5", "text": "#2D2D2D"},
        "fonts": {"title": "Great Vibes", "body": "Lato", "accent": "Cormorant Garamond"},
        "title": "Our Love Story", "subtitle": "Forever Begins Today"
    },
    "baby": {
        "style": "playful", "frameId": "rounded",
        "colors": {"primary": "#FFB5BA", "secondary": "#B5DEFF", "accent": "#FFF176", "background": "#FFFDE7", "text": "#424242"},
        "fonts": {"title": "Quicksand", "body": "Nunito", "accent": "Patrick Hand"},
        "title": "Precious Moments", "subtitle": "Little Miracle"
    },
    "nature": {
        "style": "elegant", "frameId": "simple-white",
        "colors": {"primary": "#355E3B", "secondary": "#8FBC8F", "accent": "#DAA520", "background": "#F5F5DC", "text": "#2F4F4F"},
        "fonts": {"title": "Cormorant Garamond", "body": "Lato", "accent": "Satisfy"},
        "title": "Nature's Beauty", "subtitle": "Into the Wild"
    },
    "travel": {
        "style": "modern", "frameId": "shadow",
        "colors": {"primary": "#1A535C", "secondary": "#4ECDC4", "accent": "#FF6B6B", "background": "#F7FFF7", "text": "#1A1A1A"},
        "fonts": {"title": "Abril Fatface", "body": "Poppins", "accent": "Permanent Marker"},
        "title": "Wanderlust", "subtitle": "Adventure Calls"
    },
    "family": {
        "style": "playful", "frameId": "rounded",
        "colors": {"primary": "#E07A5F", "secondary": "#F4F1DE", "accent": "#81B29A", "background": "#FFFCF2", "text": "#3D405B"},
        "fonts": {"title": "Nunito", "body": "Open Sans", "accent": "Kalam"},
        "title": "Family Moments", "subtitle": "Together is Best"
    },
    "default": {
        "style": "elegant", "frameId": "simple-white",
        "colors": {"primary": "#2C3E50", "secondary": "#ECF0F1", "accent": "#E74C3C", "background": "#FFFFFF", "text": "#2C3E50"},
        "fonts": {"title": "Playfair Display", "body": "Open Sans", "accent": "Libre Baskerville"},
        "title": "My Photo Book", "subtitle": "Cherished Memories"
    }
}


def get_category(prompt: str) -> str:
    prompt_lower = prompt.lower()
    keywords = {
        "mountains": ["mountain", "hiking", "climb", "peak", "alps", "trail", "summit"],
        "beach": ["beach", "ocean", "sea", "summer", "vacation", "tropical", "sand", "wave"],
        "wedding": ["wedding", "marriage", "bride", "groom", "engagement", "love", "romantic"],
        "baby": ["baby", "newborn", "infant", "child", "kid", "toddler"],
        "nature": ["nature", "forest", "tree", "flower", "garden", "wildlife", "bird"],
        "travel": ["travel", "trip", "journey", "explore", "city", "adventure"],
        "family": ["family", "reunion", "gathering", "together", "celebration"]
    }
    for cat, kws in keywords.items():
        if any(k in prompt_lower for k in kws):
            return cat
    return "default"


async def generate_theme(prompt: str) -> dict:
    category = get_category(prompt)
    
    if model:
        try:
            resp = model.generate_content(f'''Create photo album theme for "{prompt}". Return ONLY JSON:
{{"style":"elegant|playful|vintage|modern|romantic","colors":{{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","text":"#hex"}},"fonts":{{"title":"Font","body":"Font","accent":"Font"}},"frameId":"simple-white|rounded|shadow|polaroid","title":"Title","subtitle":"Subtitle","quotes":["quote1","quote2","quote3"]}}''')
            
            text = resp.text.strip()
            if "```" in text:
                text = text.split("```")[1].replace("json", "").strip()
            
            start, end = text.find('{'), text.rfind('}') + 1
            if start >= 0 and end > start:
                theme = json.loads(text[start:end])
                theme["category"] = category
                return theme
        except Exception as e:
            print(f"[Gemini] Error: {e}")
    
    # Fallback
    theme = THEME_PRESETS.get(category, THEME_PRESETS["default"]).copy()
    theme["category"] = category
    theme["quotes"] = DECORATIVE_TEXTS.get(category, DECORATIVE_TEXTS["default"])
    if prompt and len(prompt) < 30:
        theme["title"] = prompt.title()
    return theme


# =============================================================================
# PAGE GENERATION
# =============================================================================

LAYOUTS = {
    "single": [{"x": 10, "y": 10, "width": 80, "height": 80}],
    "double_v": [{"x": 10, "y": 5, "width": 80, "height": 43}, {"x": 10, "y": 52, "width": 80, "height": 43}],
    "double_h": [{"x": 5, "y": 15, "width": 43, "height": 70}, {"x": 52, "y": 15, "width": 43, "height": 70}],
    "triple_l": [{"x": 5, "y": 5, "width": 55, "height": 90}, {"x": 63, "y": 5, "width": 32, "height": 43}, {"x": 63, "y": 52, "width": 32, "height": 43}],
    "triple_t": [{"x": 10, "y": 5, "width": 80, "height": 50}, {"x": 10, "y": 58, "width": 38, "height": 37}, {"x": 52, "y": 58, "width": 38, "height": 37}],
    "grid": [{"x": 5, "y": 5, "width": 43, "height": 43}, {"x": 52, "y": 5, "width": 43, "height": 43}, {"x": 5, "y": 52, "width": 43, "height": 43}, {"x": 52, "y": 52, "width": 43, "height": 43}]
}


def generate_pages(photos, theme, max_pages, photos_per_page, ai_bg, dec_text):
    pages = []
    ids = [p.id for p in photos]
    if not ids:
        return pages
    
    cat = theme.get("category", "default")
    colors = theme.get("colors", {})
    fonts = theme.get("fonts", {})
    frame = theme.get("frameId", "simple-white")
    quotes = theme.get("quotes", DECORATIVE_TEXTS.get(cat, []))
    
    # SVG background
    svg_template = SVG_BACKGROUNDS.get(cat, SVG_BACKGROUNDS["default"])
    svg = svg_template.format(
        color1=colors.get("primary", "#2C3E50"),
        color2=colors.get("secondary", "#ECF0F1"),
        accent=colors.get("accent", "#E74C3C"),
        background=colors.get("background", "#FFFFFF")
    )
    svg_url = f"data:image/svg+xml;base64,{base64.b64encode(svg.encode()).decode()}"
    
    # COVER
    pages.append({
        "id": f"page_cover_{uuid.uuid4().hex[:8]}",
        "templateId": "cover",
        "background": {"type": "photo", "photoId": ids[0], "overlay": "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)"},
        "layout": {"slots": [{"photoId": ids[0], "x": 0, "y": 0, "width": 100, "height": 100, "rotation": 0, "zIndex": 0, "frameId": "none", "filter": "none"}]},
        "decorations": [],
        "elements": [
            {"id": f"t_{uuid.uuid4().hex[:6]}", "type": "text", "content": theme.get("title", "Album"), "x": 50, "y": 65, "width": 80,
             "style": {"fontSize": 48, "fontFamily": fonts.get("title", "Playfair Display"), "fontWeight": "bold", "color": "#FFFFFF", "textAlign": "center", "textShadow": "3px 3px 10px rgba(0,0,0,0.8)"}},
            {"id": f"s_{uuid.uuid4().hex[:6]}", "type": "text", "content": theme.get("subtitle", ""), "x": 50, "y": 78, "width": 70,
             "style": {"fontSize": 20, "fontFamily": fonts.get("accent", "Caveat"), "color": "#FFFFFF", "textAlign": "center", "textShadow": "2px 2px 6px rgba(0,0,0,0.7)"}}
        ]
    })
    
    # CONTENT PAGES
    remaining = ids[1:] if len(ids) > 1 else ids
    idx = 0
    page_num = 2
    quote_idx = 0
    
    while idx < len(remaining) and page_num <= max_pages:
        count = min(photos_per_page, len(remaining) - idx)
        
        # Select layout
        if count == 1: layout_name = "single"
        elif count == 2: layout_name = "double_h" if page_num % 2 == 0 else "double_v"
        elif count == 3: layout_name = "triple_l" if page_num % 2 == 0 else "triple_t"
        else: layout_name = "grid"
        
        layout = LAYOUTS.get(layout_name, LAYOUTS["single"])
        page_ids = remaining[idx:idx + count]
        
        # Slots
        slots = []
        for i, pid in enumerate(page_ids):
            if i < len(layout):
                t = layout[i]
                slots.append({"photoId": pid, "x": t["x"], "y": t["y"], "width": t["width"], "height": t["height"], "rotation": 0, "zIndex": i + 1, "frameId": frame, "filter": "none"})
        
        # Background variety
        if page_num % 4 == 0 and ai_bg:
            bg = {"type": "ai_generated", "ai_image_url": svg_url}
        elif page_num % 3 == 0:
            bg = {"type": "gradient", "gradient_colors": [colors.get("background", "#FFF"), colors.get("secondary", "#F0F0F0")], "gradient_angle": 135 if page_num % 2 == 0 else 225}
        else:
            bg = {"color": colors.get("background", "#FFFFFF")}
        
        # Elements
        elements = []
        if dec_text and page_num % 3 == 0 and quote_idx < len(quotes):
            elements.append({
                "id": f"q_{uuid.uuid4().hex[:6]}", "type": "text", "content": f'"{quotes[quote_idx]}"',
                "x": 50, "y": 95, "width": 90,
                "style": {"fontSize": 14, "fontFamily": fonts.get("accent", "Caveat"), "fontStyle": "italic", "color": colors.get("text", "#333"), "textAlign": "center", "opacity": 0.7}
            })
            quote_idx += 1
        
        pages.append({
            "id": f"page_{page_num}_{uuid.uuid4().hex[:8]}",
            "templateId": f"layout-{layout_name}",
            "background": bg,
            "layout": {"slots": slots},
            "decorations": [],
            "elements": elements
        })
        
        idx += count
        page_num += 1
    
    # CLOSING PAGE
    if len(pages) > 2 and dec_text:
        closing_quote = quotes[-1] if quotes else "The End"
        pages.append({
            "id": f"page_end_{uuid.uuid4().hex[:8]}",
            "templateId": "closing",
            "background": {"type": "gradient", "gradient_colors": [colors.get("primary", "#2C3E50"), colors.get("secondary", "#ECF0F1")], "gradient_angle": 180},
            "layout": {"slots": []},
            "decorations": [],
            "elements": [
                {"id": f"c_{uuid.uuid4().hex[:6]}", "type": "text", "content": closing_quote, "x": 50, "y": 45, "width": 70,
                 "style": {"fontSize": 32, "fontFamily": fonts.get("accent", "Caveat"), "color": "#FFFFFF", "textAlign": "center"}},
                {"id": f"y_{uuid.uuid4().hex[:6]}", "type": "text", "content": "2026", "x": 50, "y": 60, "width": 50,
                 "style": {"fontSize": 18, "fontFamily": fonts.get("body", "Open Sans"), "color": "#FFFFFF", "textAlign": "center", "opacity": 0.8}}
            ]
        })
    
    return pages


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "4.0", "gemini": MODEL_NAME or "fallback", "vision": VISION_AVAILABLE}


@app.post("/magic/analyze-photos")
async def analyze_photos(req: AnalyzePhotosRequest) -> AnalyzePhotosResponse:
    if not VISION_AVAILABLE:
        return AnalyzePhotosResponse(valid_photos=req.photos, trash_photos=[], analysis_available=False)
    
    analyzer = PhotoAnalyzer()
    valid, trash = [], []
    
    for photo in req.photos:
        # Check if photo is valid
        result = analyzer.analyze_photo(photo)
        if result:
            trash.append(result)
        else:
            valid.append(photo)

    print(f"[Analyze] Valid: {len(valid)}, Trash: {len(trash)}")
    return AnalyzePhotosResponse(valid_photos=valid, trash_photos=trash, analysis_available=True)


@app.post("/magic/create")
async def magic_create(req: MagicCreateRequest):
    try:
        print(f"\n{'='*50}\n[Magic v4] {req.prompt} | {len(req.photos)} photos\n{'='*50}")
        
        if not req.photos:
            raise HTTPException(400, "No photos")
        
        theme = await generate_theme(req.prompt)
        print(f"[Magic v4] Theme: {theme.get('style')} - {theme.get('title')}")
        
        pages = generate_pages(req.photos, theme, req.max_pages, req.photos_per_page, req.include_ai_backgrounds, req.include_decorative_text)
        print(f"[Magic v4] Pages: {len(pages)}")
        
        return {"success": True, "album_id": f"album_{uuid.uuid4().hex[:8]}", "theme": theme, "pages": pages}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Magic v4] ERROR: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(500, f"Failed: {e}")


@app.get("/")
async def root():
    return {"service": "Magic Create v4", "features": ["AI backgrounds", "Themed text", "Trash detection"]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
