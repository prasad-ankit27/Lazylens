"""
Vision Module for Lazylens
Uses local Ollama API (POST /api/generate) with the 'llava' model
to extract a concise, descriptive scene summary from a staged image.
Uses standard Python 'requests' without external SDKs.
"""

import os
import io
import sys
import base64
import asyncio
from typing import Optional
from PIL import Image
import requests
from dotenv import load_dotenv

load_dotenv()

OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434")
OLLAMA_VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "llava")


def encode_image_for_vision(image_path: str, max_dimension: int = 512) -> str:
    """
    Reads an image from disk, optimizes dimensions (512px max) for rapid CLIP/vision encoding,
    and returns a base64-encoded UTF-8 string.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at: {image_path}")

    with Image.open(image_path) as img:
        # Convert RGBA/P to RGB for clean JPEG encoding
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Resize to max_dimension (512px is optimal for llava's 336px vision encoder)
        w, h = img.size
        if max(w, h) > max_dimension:
            scale = max_dimension / max(w, h)
            new_size = (int(round(w * scale)), int(round(h * scale)))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=80)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")


def analyze_scene_sync(
    image_path: str,
    ollama_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout: int = 120,
) -> str:
    """
    Synchronous scene analysis using Ollama's vision model via requests.
    """
    base_url = (ollama_url or OLLAMA_API_URL).rstrip("/")
    target_model = model or OLLAMA_VISION_MODEL
    endpoint = f"{base_url}/api/generate"

    base64_image = encode_image_for_vision(image_path)

    prompt = (
        "Describe this photo in 1 to 2 concise, vivid sentences. "
        "Highlight the primary subject, lighting, mood, aesthetic tones, and setting."
    )

    payload = {
        "model": target_model,
        "prompt": prompt,
        "images": [base64_image],
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 64,
        },
    }

    try:
        response = requests.post(endpoint, json=payload, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        summary = data.get("response", "").strip()
        if not summary:
            return "A stylized visual composition captured with artistic lighting and balanced aesthetics."
        return summary
    except Exception as e:
        print(f"[Vision Error] Failed to analyze scene with Ollama ({target_model}): {e}")
        return "An aesthetically curated moment with thoughtful composition and warm ambient light."


async def analyze_scene(
    image_path: str,
    ollama_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout: int = 120,
) -> str:
    """
    Asynchronous wrapper for analyze_scene_sync using asyncio.to_thread.
    Ensures non-blocking execution while strictly using standard requests.
    """
    return await asyncio.to_thread(
        analyze_scene_sync,
        image_path=image_path,
        ollama_url=ollama_url,
        model=model,
        timeout=timeout,
    )


if __name__ == "__main__":
    import sys
    test_img = sys.argv[1] if len(sys.argv) > 1 else "frontend/public/demo/demo1.jpg"
    print(f"Testing vision analysis on: {test_img}")
    result = analyze_scene_sync(test_img)
    print("\n--- Scene Summary ---")
    print(result)
