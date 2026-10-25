"""
Captions Module for Lazylens
Takes an extracted scene summary and queries Ollama (POST /api/generate)
using the 'gemma2:2b' model with format='json'.
Returns a structured JSON payload with 3 caption variations and hashtags:
  - aesthetic: Short, minimal, lowercase, evocative caption.
  - witty: Relatable, playful caption.
  - hinglish: Natural Hindi-English blend caption.
  - hashtags: An array of 4-6 relevant hashtags.
Uses standard Python 'requests' without external SDKs.
"""

import os
import re
import json
import asyncio
from typing import Dict, Any, List, Optional
import requests
from dotenv import load_dotenv

load_dotenv()

OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434")
OLLAMA_TEXT_MODEL = os.getenv("OLLAMA_TEXT_MODEL", "gemma2:2b")


def clean_json_response(raw_text: str) -> Dict[str, Any]:
    """
    Cleans markdown code fences or surrounding text and parses JSON.
    """
    trimmed = raw_text.strip()
    # Strip markdown code blocks ```json ... ```
    if trimmed.startswith("```"):
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", trimmed)
        if match:
            trimmed = match.group(1).strip()

    try:
        data = json.loads(trimmed)
        if isinstance(data, dict):
            return data
    except Exception:
        # Fallback: attempt regex extraction of key fields
        pass

    # Fallback structure if JSON parsing failed
    return {}


def generate_captions_sync(
    scene_summary: str,
    ollama_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout: int = 45,
) -> Dict[str, Any]:
    """
    Synchronous caption generation using Ollama gemma2:2b model via requests.
    """
    base_url = (ollama_url or OLLAMA_API_URL).rstrip("/")
    target_model = model or OLLAMA_TEXT_MODEL
    endpoint = f"{base_url}/api/generate"

    system_instructions = (
        "You are an elite social media copywriter and aesthetic curator. "
        "Based on the provided scene summary, generate exactly 3 distinct caption variations and hashtags. "
        "You must return ONLY a JSON object with this exact structure:\n"
        "{\n"
        '  "aesthetic": "short, minimal, lowercase, evocative caption with subtle punctuation",\n'
        '  "witty": "relatable, witty, clever caption with humor or punchy attitude",\n'
        '  "hinglish": "natural urban Hindi-English blend caption (using words like scene, vibes, yaar, mast, baat)",\n'
        '  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]\n'
        "}"
    )

    prompt = f"{system_instructions}\n\nScene Summary:\n\"{scene_summary}\"\n\nJSON Output:"

    payload = {
        "model": target_model,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "num_predict": 300,
        },
    }

    try:
        response = requests.post(endpoint, json=payload, timeout=timeout)
        response.raise_for_status()
        raw_output = response.json().get("response", "")
        parsed = clean_json_response(raw_output)

        # Validate and normalize fields
        aesthetic = parsed.get("aesthetic") or "chasing quiet moments in loud places."
        witty = parsed.get("witty") or "Came for the vibe, stayed because leaving required effort."
        hinglish = parsed.get("hinglish") or "Vibe check passed, baaki sab moh maya hai."
        hashtags = parsed.get("hashtags")

        if not isinstance(hashtags, list) or len(hashtags) < 3:
            hashtags = ["#lazylens", "#visualdiaries", "#streetstyle", "#portraitmode", "#goldenhour"]

        # Ensure hashtags start with #
        clean_hashtags = [f"#{tag.lstrip('#')}" for tag in hashtags[:6]]

        return {
            "summary": scene_summary,
            "aesthetic": aesthetic.strip().lower(),
            "witty": witty.strip(),
            "hinglish": hinglish.strip(),
            "hashtags": clean_hashtags,
        }

    except Exception as e:
        print(f"[Captions Error] Failed to generate captions with Ollama ({target_model}): {e}")
        # Graceful fallback so rendering never crashes
        return {
            "summary": scene_summary,
            "aesthetic": "lost in the rhythm of the city lights.",
            "witty": "Proof that I occasionally step out of my room.",
            "hinglish": "Scene sorted hai, bas captions ki kami thi.",
            "hashtags": ["#lazylens", "#urbanvibes", "#capturethemoment", "#aesthetic", "#lifestyle"],
        }


async def generate_captions(
    scene_summary: str,
    ollama_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout: int = 45,
) -> Dict[str, Any]:
    """
    Asynchronous wrapper for generate_captions_sync using asyncio.to_thread.
    """
    return await asyncio.to_thread(
        generate_captions_sync,
        scene_summary=scene_summary,
        ollama_url=ollama_url,
        model=model,
        timeout=timeout,
    )


async def generate_image_captions(
    image_path: str,
    ollama_url: Optional[str] = None,
    vision_model: Optional[str] = None,
    text_model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Complete asynchronous pipeline:
    1. Analyzes the staged image via Ollama (llava) to extract a scene summary.
    2. Feeds the summary into Gemma 2 (gemma2:2b) to generate aesthetic, witty, hinglish captions and hashtags.
    """
    from tools.vision import analyze_scene
    summary = await analyze_scene(image_path, ollama_url=ollama_url, model=vision_model)
    return await generate_captions(summary, ollama_url=ollama_url, model=text_model)


if __name__ == "__main__":
    test_summary = "A young woman wearing a leather jacket and sequin dress standing on a bustling Tokyo neon street at twilight."
    print("Testing caption generation for:", test_summary)
    result = generate_captions_sync(test_summary)
    print("\n--- Generated Captions ---")
    print(json.dumps(result, indent=2))
