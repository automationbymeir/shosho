
# app/services/imagen_client.py

import httpx
import base64
from typing import Optional
from app.config import get_settings

settings = get_settings()

class ImagenClient:
    """
    Client for Google Imagen API to generate custom backgrounds.
    """
    
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.endpoint = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict"
    
    async def generate_background(
        self,
        prompt: str,
        aspect_ratio: str = "3:4",  # Album page ratio
        style_preset: Optional[str] = None
    ) -> Optional[str]:
        """
        Generate a background image using Imagen.
        """
        # Return None if no API key or in mock mode for testing
        if not self.api_key:
            return None

        # Enhance prompt for album backgrounds
        enhanced_prompt = f"Subtle, elegant background for photo album page. {prompt}. Soft focus, muted colors, suitable as backdrop for photographs. No text, no people, abstract or textured."
        
        if style_preset:
            enhanced_prompt += f" Style: {style_preset}."
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.endpoint,
                    headers={
                        "Content-Type": "application/json",
                        "x-goog-api-key": self.api_key
                    },
                    json={
                        "instances": [{"prompt": enhanced_prompt}],
                        "parameters": {
                            "sampleCount": 1,
                            "aspectRatio": aspect_ratio,
                            "safetyFilterLevel": "block_few",
                            "personGeneration": "dont_allow"
                        }
                    },
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    predictions = data.get("predictions", [])
                    if predictions:
                        return predictions[0].get("bytesBase64Encoded")
                
                return None
                
            except Exception as e:
                print(f"Imagen generation failed: {e}")
                return None
    
    async def generate_pattern(
        self,
        pattern_type: str,
        colors: list[str],
        density: str = "light"
    ) -> Optional[str]:
        """
        Generate a seamless pattern for backgrounds.
        """
        color_desc = ", ".join(colors[:3])
        prompt = f"Seamless {pattern_type} pattern in {color_desc}. {density} density, subtle, elegant, tileable texture for photo album background."
        
        return await self.generate_background(prompt, style_preset="pattern")
