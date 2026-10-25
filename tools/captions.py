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


def normalize_caption(text: str) -> str:
    """Normalize caption for deduplication comparison."""
    cleaned = re.sub(r"[^\w\s]", "", text.lower())
    return " ".join(cleaned.split())


def is_duplicate(candidate: str, recents: List[str], threshold: float = 0.70) -> bool:
    """Checks whether a candidate caption is duplicate or too similar to recent captions."""
    norm_c = normalize_caption(candidate)
    if not norm_c:
        return True
    set_c = set(norm_c.split())
    for r in recents:
        norm_r = normalize_caption(r)
        if norm_c == norm_r:
            return True
        set_r = set(norm_r.split())
        if set_c and set_r:
            jaccard = len(set_c & set_r) / len(set_c | set_r)
            if jaccard >= threshold:
                return True
    return False


def generate_5_captions_sync(
    scene_summary: str,
    recent_captions: Optional[List[str]] = None,
    ollama_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout: int = 45,
) -> Dict[str, Any]:
    """
    Generates exactly 5 distinct, context-aware captions tailored to the provided scene summary.
    Enforces 5 meaningfully different tones/perspectives:
      1. Aesthetic (poetic, minimal, evocative, lowercase)
      2. Witty (relatable, playful, humorous observation)
      3. Hinglish (natural urban Hindi-English blend with vibe/scene words)
      4. Storytelling (experiential, narrative, lingering gathering memory)
      5. Punchy (short, impactful, 3-6 words)
    Tracks normalized text against recent_captions to avoid repetition.
    Applies bounded retry (up to 2 retries) if duplicates are generated.
    """
    base_url = (ollama_url or OLLAMA_API_URL).rstrip("/")
    target_model = model or OLLAMA_TEXT_MODEL
    endpoint = f"{base_url}/api/generate"
    recents = [r.strip() for r in (recent_captions or []) if r and r.strip()]

    tones_config = [
        {"tone": "aesthetic", "label": "Aesthetic", "desc": "Minimalist, lowercase, poetic, atmospheric."},
        {"tone": "witty", "label": "Witty", "desc": "Clever, relatable observation with lighthearted humor."},
        {"tone": "hinglish", "label": "Hinglish", "desc": "Urban natural Hindi-English blend (e.g. vibe, scene, yaar, sorted, mahaul)."},
        {"tone": "story", "label": "Storytelling", "desc": "Experiential, narrative, capturing the collective shared moment."},
        {"tone": "punchy", "label": "Punchy", "desc": "Short, bold, impactful (3 to 6 words max)."},
    ]

    # Build prompt
    avoid_clause = ""
    if recents:
        avoid_clause = (
            "\n\nCRITICAL DEDUPLICATION RULE:\n"
            "Do NOT repeat, duplicate, or closely paraphrase any of these recently used captions:\n"
            + "\n".join(f"- \"{r}\"" for r in recents[-10:])
            + "\nProvide fresh, distinct phrasing."
        )

    system_instructions = (
        "You are an elite creative social media copywriter. "
        "Analyze the provided photo collection scene summary and craft exactly 5 distinct captions "
        "tailored specifically to its depicted mood, lighting, people, and aesthetic.\n"
        "Each caption must reflect one of these 5 tones:\n"
        "1. aesthetic: minimal, lowercase, poetic, atmospheric\n"
        "2. witty: clever, relatable, lighthearted humor\n"
        "3. hinglish: urban natural Hindi-English blend\n"
        "4. story: narrative, experiential, capturing the collective memory\n"
        "5. punchy: short, bold, impactful (3-6 words)\n"
        + avoid_clause +
        "\n\nYou MUST return ONLY a JSON object formatted exactly as:\n"
        "{\n"
        '  "captions": [\n'
        '    {"tone": "aesthetic", "label": "Aesthetic", "text": "..."},\n'
        '    {"tone": "witty", "label": "Witty", "text": "..."},\n'
        '    {"tone": "hinglish", "label": "Hinglish", "text": "..."},\n'
        '    {"tone": "story", "label": "Storytelling", "text": "..."},\n'
        '    {"tone": "punchy", "label": "Punchy", "text": "..."}\n'
        "  ]\n"
        "}"
    )

    prompt = f"{system_instructions}\n\nScene Summary:\n\"{scene_summary}\"\n\nJSON Output:"

    max_attempts = 3
    final_captions: List[Dict[str, str]] = []

    for attempt in range(max_attempts):
        payload = {
            "model": target_model,
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.7 + (attempt * 0.1),
                "top_p": 0.9,
                "num_predict": 400,
            },
        }

        try:
            response = requests.post(endpoint, json=payload, timeout=timeout)
            response.raise_for_status()
            raw_output = response.json().get("response", "")
            parsed = clean_json_response(raw_output)
            raw_list = parsed.get("captions") or []

            # If raw_list was returned as strings instead of dicts, format them
            extracted: List[Dict[str, str]] = []
            for idx, item in enumerate(raw_list):
                tone_meta = tones_config[idx % len(tones_config)]
                if isinstance(item, dict):
                    text = item.get("text") or item.get("caption") or ""
                    tone = item.get("tone") or tone_meta["tone"]
                    label = item.get("label") or tone_meta["label"]
                elif isinstance(item, str):
                    text = item
                    tone = tone_meta["tone"]
                    label = tone_meta["label"]
                else:
                    continue

                clean_text = text.strip().strip('"')
                if clean_text:
                    extracted.append({
                        "tone": tone,
                        "label": label,
                        "text": clean_text.lower() if tone == "aesthetic" else clean_text,
                    })

            # Check for duplicates against recent_captions and internal duplicates
            unique_candidates: List[Dict[str, str]] = []
            seen_texts: List[str] = list(recents)

            for cand in extracted:
                if not is_duplicate(cand["text"], seen_texts):
                    unique_candidates.append(cand)
                    seen_texts.append(cand["text"])

            if len(unique_candidates) >= 5:
                final_captions = unique_candidates[:5]
                break
            elif len(unique_candidates) > len(final_captions):
                final_captions = unique_candidates

        except requests.exceptions.RequestException as e:
            print(f"[Captions Warning] Ollama text service unavailable at {base_url}, proceeding to grounded context generator: {e}")
            break
        except Exception as parse_err:
            print(f"[Captions Warning] Parsing attempt {attempt + 1} failed: {parse_err}")

    # Fallback to ensure exactly 5 distinct items if bounded retries didn't yield all 5
    if len(final_captions) < 5:
        existing_tones = {c["tone"] for c in final_captions}
        for tone_meta in tones_config:
            if len(final_captions) >= 5:
                break
            if tone_meta["tone"] not in existing_tones:
                # Create a tailored caption derived from scene_summary
                summary_snippet = scene_summary.split(".")[0].strip()
                if tone_meta["tone"] == "aesthetic":
                    fallback_text = f"framed in quiet light: {summary_snippet.lower()}."
                elif tone_meta["tone"] == "witty":
                    fallback_text = f"Stepping out for the vibe: {summary_snippet}."
                elif tone_meta["tone"] == "hinglish":
                    fallback_text = f"Poora scene sorted hai boss — {summary_snippet}."
                elif tone_meta["tone"] == "story":
                    fallback_text = f"These are the evenings we keep: {summary_snippet}."
                else:
                    fallback_text = "Moments in focus."

                if not is_duplicate(fallback_text, [c["text"] for c in final_captions] + recents):
                    final_captions.append({
                        "tone": tone_meta["tone"],
                        "label": tone_meta["label"],
                        "text": fallback_text,
                    })

    return {
        "captions": final_captions[:5],
        "scene_summary": scene_summary,
        "total": len(final_captions[:5]),
    }


async def generate_captions(scene_summary: str) -> Dict[str, Any]:
    return await asyncio.to_thread(generate_captions_sync, scene_summary)


async def generate_5_captions(
    scene_summary: str,
    recent_captions: Optional[List[str]] = None,
    ollama_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout: int = 45,
) -> Dict[str, Any]:
    """
    Asynchronous wrapper for generate_5_captions_sync.
    """
    return await asyncio.to_thread(
        generate_5_captions_sync,
        scene_summary=scene_summary,
        recent_captions=recent_captions,
        ollama_url=ollama_url,
        model=model,
        timeout=timeout,
    )


async def generate_5_image_captions(
    images: List[str],
    recent_captions: Optional[List[str]] = None,
    ollama_url: Optional[str] = None,
    vision_model: Optional[str] = None,
    text_model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Full context-aware pipeline:
    1. Multi-image scene analysis via Ollama (llava).
    2. 5 distinct captions via Gemma 2 (gemma2:2b) with deduplication against recent_captions.
    """
    from tools.vision import analyze_multiscene
    summary = await analyze_multiscene(images, ollama_url=ollama_url, model=vision_model)
    return await generate_5_captions(
        scene_summary=summary,
        recent_captions=recent_captions,
        ollama_url=ollama_url,
        model=text_model,
    )


if __name__ == "__main__":
    test_summary = "A cozy warm candlelit restaurant with friends laughing over gourmet dishes and drinks in warm ambient lighting."
    print("Testing 5 caption generation for:", test_summary)
    result = generate_5_captions_sync(test_summary)
    print("\n--- Generated 5 Captions ---")
    print(json.dumps(result, indent=2))

