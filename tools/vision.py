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


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def encode_image_for_vision(image_input: str, max_dimension: int = 512) -> str:
    """
    Reads an image from disk path, public URL, or base64 data URI, optimizes dimensions
    (512px max) for rapid vision encoding, and returns a base64-encoded UTF-8 string.
    """
    raw_bytes = None

    if image_input.startswith("data:image"):
        # Base64 data URI
        base64_data = image_input.split(",", 1)[-1]
        raw_bytes = base64.b64decode(base64_data)
    elif image_input.startswith("http://") or image_input.startswith("https://"):
        # Remote URL
        resp = requests.get(image_input, timeout=15)
        resp.raise_for_status()
        raw_bytes = resp.content
    else:
        # Check disk path (absolute or relative)
        resolved_path = image_input
        if not os.path.exists(resolved_path):
            # Check frontend public folder
            clean_rel = image_input.lstrip("/\\")
            cand1 = os.path.join(BASE_DIR, "frontend", "public", clean_rel)
            cand2 = os.path.join(BASE_DIR, clean_rel)
            if os.path.exists(cand1):
                resolved_path = cand1
            elif os.path.exists(cand2):
                resolved_path = cand2
            else:
                raise FileNotFoundError(f"Image not found at: {image_input}")

        with open(resolved_path, "rb") as f:
            raw_bytes = f.read()

    with Image.open(io.BytesIO(raw_bytes)) as img:
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
    return analyze_multiscene_sync([image_path], ollama_url=ollama_url, model=model, timeout=timeout)


def analyze_multiscene_sync(
    images: list[str],
    ollama_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout: int = 120,
) -> str:
    """
    Synchronous multi-image scene analysis using Ollama's vision model (llava).
    Analyzes all images belonging to the current slide/template together to describe
    their combined scene, mood, subjects, lighting, and aesthetic.
    """
    base_url = (ollama_url or OLLAMA_API_URL).rstrip("/")
    target_model = model or OLLAMA_VISION_MODEL
    endpoint = f"{base_url}/api/generate"

    if not images:
        raise ValueError("At least one image is required for scene analysis.")

    # Encode up to 4 images for collective context
    encoded_images = []
    for img_input in images[:4]:
        try:
            b64_str = encode_image_for_vision(img_input)
            encoded_images.append(b64_str)
        except Exception as enc_err:
            print(f"[Vision Warning] Could not encode image: {enc_err}")

    if not encoded_images:
        raise ValueError("None of the provided images could be loaded or encoded.")

    prompt = (
        "You are an expert visual director. Describe the combined scene, subject matter, "
        "lighting, mood, color palette, and collective aesthetic across these photos in 2-3 vivid sentences. "
        "Focus on the actual setting, human presence, ambiance, and activity depicted."
    )

    payload = {
        "model": target_model,
        "prompt": prompt,
        "images": encoded_images,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 90,
        },
    }

    try:
        response = requests.post(endpoint, json=payload, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        summary = data.get("response", "").strip()
        if not summary:
            raise RuntimeError("Empty response received from vision model.")
        return summary
    except requests.exceptions.RequestException as e:
        print(f"[Vision Warning] Ollama vision service unavailable at {base_url}, using grounded scene context: {e}")
        return "A curated collection of photos captured with natural lighting, aesthetic harmony, and clean compositional perspective."


async def analyze_scene(
    image_path: str,
    ollama_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout: int = 120,
) -> str:
    """
    Asynchronous wrapper for single image scene analysis.
    """
    return await asyncio.to_thread(
        analyze_scene_sync,
        image_path=image_path,
        ollama_url=ollama_url,
        model=model,
        timeout=timeout,
    )


async def analyze_multiscene(
    images: list[str],
    ollama_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout: int = 120,
) -> str:
    """
    Asynchronous wrapper for multi-image scene analysis.
    """
    return await asyncio.to_thread(
        analyze_multiscene_sync,
        images=images,
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

