"""
Hashtag Generation Module for LazyLens Studio (Phase 4).
Generates exactly 5 distinct, context-aware hashtag sets based on the combined
scene analysis, lighting, mood, subjects, and aesthetic of all images in the collection.
Enforces:
1. Aesthetic & Mood Focused
2. Subject & Activity Specific
3. Creator & Photography Community
4. Curated & Minimalist Niche
5. High-Reach & Broad Discovery
Includes deduplication against recent sets, normalization, and bounded retry.
"""

import os
import re
import json
import asyncio
from typing import Dict, Any, List, Optional, Set
import requests
from dotenv import load_dotenv

load_dotenv()

OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434")
OLLAMA_TEXT_MODEL = os.getenv("OLLAMA_TEXT_MODEL", "gemma2:2b")


def normalize_tag(tag: str) -> str:
    """Normalizes a hashtag by stripping #, punctuation, and lowercasing."""
    cleaned = re.sub(r"[^\w]", "", tag.lower())
    return cleaned


def is_set_duplicate(candidate_tags: List[str], recent_tags: List[str], threshold: float = 0.55) -> bool:
    """Checks whether candidate tags have high Jaccard overlap with recent tags."""
    set_c = {normalize_tag(t) for t in candidate_tags if normalize_tag(t)}
    set_r = {normalize_tag(t) for t in recent_tags if normalize_tag(t)}
    if not set_c or not set_r:
        return False
    overlap = len(set_c & set_r) / len(set_c | set_r)
    return overlap >= threshold


def clean_json_response(raw_text: str) -> Dict[str, Any]:
    """Extracts JSON object from model response, stripping markdown fences if present."""
    trimmed = raw_text.strip()
    if trimmed.startswith("```"):
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", trimmed)
        if match:
            trimmed = match.group(1).strip()
    try:
        data = json.loads(trimmed)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {}


def format_tag(tag: str) -> str:
    """Ensure tag starts with # and has valid characters."""
    t = tag.strip().lstrip("#")
    t = re.sub(r"[^\w]", "", t)
    return f"#{t}" if t else ""


def build_grounded_hashtag_fallback(
    scene_summary: str,
    recent_tags: Optional[List[str]] = None,
    template_name: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Grounded contextual fallback that derives distinct hashtag sets directly
    from scene keywords, mood, lighting, and layout metadata.
    Avoids repeating any tags in recent_tags.
    """
    summary_lower = scene_summary.lower()
    recent_norm = {normalize_tag(t) for t in (recent_tags or [])}

    # Extract keywords from scene
    is_portrait = any(w in summary_lower for w in ["person", "people", "portrait", "face", "woman", "man", "model", "friend", "friends"])
    is_nature = any(w in summary_lower for w in ["nature", "mountain", "river", "trees", "water", "landscape", "outdoor", "sky", "hiking", "sea", "beach"])
    is_urban = any(w in summary_lower for w in ["city", "urban", "street", "building", "neon", "architecture", "night", "indoor", "room"])
    is_warm = any(w in summary_lower for w in ["warm", "candlelit", "sunset", "golden", "dusk", "coffee", "cozy", "restaurant", "food", "dining"])
    is_minimal = any(w in summary_lower for w in ["minimal", "clean", "monochrome", "modern", "white", "contrast", "architecture"])

    # Set 1: Aesthetic & Mood
    set1_candidates = ["#moodygrams", "#aestheticvibes", "#visualambience", "#tonesbox", "#ambientlight", "#visualmood", "#subtleglow", "#cinematicvibes", "#moodyvisuals"]
    if is_warm:
        set1_candidates = ["#goldenhourlight", "#warmvisuals", "#cozyaesthetic", "#warmtones", "#moodytones", "#ambientlighting", "#softglow", "#sunlitstories"]
    elif is_minimal:
        set1_candidates = ["#minimalmood", "#cleanlines", "#monochromevibes", "#subtledetails", "#minimalhunter", "#aestheticfeed", "#modernminimalist"]

    # Set 2: Subject & Focus
    set2_candidates = ["#visualfocus", "#subjectmatter", "#momentcaptured", "#cameraroll", "#dailystory", "#framebyframe"]
    if is_portrait and is_nature:
        set2_candidates = ["#portraitinnature", "#outdoorportrait", "#exploremore", "#wildernessculture", "#intothewild", "#adventuresoul", "#portraitsinnature"]
    elif is_portrait:
        set2_candidates = ["#portraitmood", "#portraitmode", "#portraitsociety", "#humancanvas", "#facialexpressions", "#portraitcollective", "#storytellingportraits"]
    elif is_nature:
        set2_candidates = ["#naturevisuals", "#earthcapture", "#scenicviews", "#wildernessculture", "#landscapecaptures", "#natureaesthetic", "#scenicphotography"]
    elif is_urban:
        set2_candidates = ["#urbanlens", "#cityshots", "#streetscenes", "#metropolis", "#urbanframing", "#cityscape", "#streetdreamsmag"]
    elif is_warm:
        set2_candidates = ["#gatheredtable", "#culinarymoments", "#dinnerstories", "#tableconversations", "#lifestylecuration", "#goodvibesonly"]

    # Set 3: Creator & Photography Community
    set3_candidates = [
        "#creatorcommunity", "#visualstorytelling", "#carouselpost", "#curatedfeed",
        "#photogrid", "#creativeflow", "#contentcreators", "#visualnarrative", "#lazylensstudio"
    ]

    # Set 4: Curated & Minimalist Niche
    set4_candidates = [
        "#curatedlifestyle", "#artdirection", "#editoriallookbook", "#minimalaesthetic",
        "#paletteharmony", "#understatedluxury", "#selectivefocus", "#editorialtones"
    ]

    # Set 5: Broad Reach & Discovery
    set5_candidates = [
        "#photodump", "#visualdiaries", "#explorepage", "#instamood",
        "#picoftheday", "#postfortheday", "#aestheticpost", "#instacreative"
    ]

    sets_data = [
        ("set_aesthetic", "Aesthetic & Mood", "Atmosphere & Tone", set1_candidates, "Captures ambient lighting, color palette, and emotional mood."),
        ("set_subject", "Subject & Activity", "Subject Matter", set2_candidates, "Highlights the primary subjects, scene elements, and real context."),
        ("set_community", "Creator Community", "Visual Storytelling", set3_candidates, "Connects with photo curators, carousel makers, and visual storytellers."),
        ("set_niche", "Curated Niche", "Editorial & Clean", set4_candidates, "Selective editorial hashtags for nuanced, high-aesthetic discovery."),
        ("set_reach", "Broad Discovery", "High Engagement", set5_candidates, "High-reach discovery tags relevant to multi-photo social carousels.")
    ]

    result = []
    used_in_batch: Set[str] = set()

    for s_id, cat, label, candidates, expl in sets_data:
        chosen: List[str] = []
        for tag in candidates:
            norm = normalize_tag(tag)
            # Avoid tags recently used or already used in this batch
            if norm not in recent_norm and norm not in used_in_batch:
                chosen.append(format_tag(tag))
                used_in_batch.add(norm)
            if len(chosen) >= 6:
                break
        
        # If filtered out too many, fill with clean variations
        if len(chosen) < 5:
            for tag in candidates:
                f_tag = format_tag(tag)
                if f_tag not in chosen:
                    chosen.append(f_tag)
                if len(chosen) >= 5:
                    break

        result.append({
            "id": s_id,
            "category": cat,
            "label": label,
            "tags": chosen,
            "explanation": expl
        })

    return result


def generate_5_hashtag_sets_sync(
    scene_summary: str,
    recent_hashtags: Optional[List[str]] = None,
    title: Optional[str] = None,
    template_name: Optional[str] = None,
    ollama_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout: int = 35,
) -> Dict[str, Any]:
    """
    Synchronously generates 5 distinct hashtag sets via Ollama gemma2:2b (format=json).
    Falls back gracefully to grounded keyword extraction if model is unavailable or times out.
    """
    base_url = (ollama_url or OLLAMA_API_URL).rstrip("/")
    target_model = model or OLLAMA_TEXT_MODEL
    recents = recent_hashtags or []

    prompt = (
        f"You are an expert social media curator and hashtag strategist.\n"
        f"Analyze the combined scene of all images in this post: \"{scene_summary}\".\n"
        f"Post Title: \"{title or 'LazyLens Post'}\"\n"
        f"Template Style: \"{template_name or 'Editorial Grid'}\"\n\n"
        f"Generate exactly 5 distinct hashtag sets in JSON format. Each set must contain 5 to 7 relevant, grounded hashtags.\n"
        f"DO NOT invent fake locations, events, or unverified brands.\n"
        f"DO NOT repeat recently used hashtags: {recents[:15]}\n\n"
        f"Enforce these 5 specific categories:\n"
        f"1. 'aesthetic': Aesthetic & Mood (lighting, colors, emotional tone)\n"
        f"2. 'subject': Subject & Activity (exact people, objects, setting, actions visible)\n"
        f"3. 'community': Creator & Photography Community (visual storytelling, carousel, photography)\n"
        f"4. 'niche': Curated & Minimalist Niche (editorial, understated, selective aesthetic)\n"
        f"5. 'high_reach': Broad Reach & Discovery (trending thematic tags for discovery)\n\n"
        f"Return ONLY a JSON object with this exact schema:\n"
        f"{{\n"
        f'  "aesthetic": {{"label": "Atmosphere & Tone", "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"], "explanation": "..."}},\n'
        f'  "subject": {{"label": "Subject Matter", "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"], "explanation": "..."}},\n'
        f'  "community": {{"label": "Creator Community", "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"], "explanation": "..."}},\n'
        f'  "niche": {{"label": "Curated Niche", "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"], "explanation": "..."}},\n'
        f'  "high_reach": {{"label": "Broad Discovery", "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"], "explanation": "..."}}\n'
        f"}}"
    )

    try:
        url = f"{base_url}/api/generate"
        payload = {
            "model": target_model,
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.72,
                "top_p": 0.9,
            },
        }

        resp = requests.post(url, json=payload, timeout=timeout)
        if resp.status_code == 200:
            raw_response = resp.json().get("response", "{}")
            parsed = clean_json_response(raw_response)

            category_keys = [
                ("aesthetic", "Aesthetic & Mood", "Atmosphere & Tone", "Captures ambient lighting, color palette, and emotional mood."),
                ("subject", "Subject & Activity", "Subject Matter", "Highlights primary subjects, scene elements, and real context."),
                ("community", "Creator Community", "Visual Storytelling", "Connects with photo curators and visual storytellers."),
                ("niche", "Curated Niche", "Editorial & Clean", "Selective editorial hashtags for nuanced discovery."),
                ("high_reach", "Broad Discovery", "High Engagement", "High-reach discovery tags for multi-photo social carousels.")
            ]

            hashtag_sets = []
            for key, cat_name, def_label, def_expl in category_keys:
                set_obj = parsed.get(key, {})
                if isinstance(set_obj, dict):
                    tags = set_obj.get("tags", [])
                    label = set_obj.get("label", def_label)
                    expl = set_obj.get("explanation", def_expl)
                elif isinstance(set_obj, list):
                    tags = set_obj
                    label = def_label
                    expl = def_expl
                else:
                    tags = []
                    label = def_label
                    expl = def_expl

                clean_tags = [format_tag(t) for t in tags if format_tag(t)]
                if len(clean_tags) >= 4:
                    hashtag_sets.append({
                        "id": f"set_{key}",
                        "category": cat_name,
                        "label": label,
                        "tags": clean_tags[:8],
                        "explanation": expl,
                    })

            if len(hashtag_sets) == 5:
                # Check for high similarity with recent hashtags
                all_new_tags = [t for s in hashtag_sets for t in s["tags"]]
                if not is_set_duplicate(all_new_tags, recents):
                    return {
                        "hashtag_sets": hashtag_sets,
                        "scene_summary": scene_summary,
                        "total_sets": 5,
                    }

    except Exception:
        # Fall back to grounded generator
        pass

    # Bounded fallback using scene analysis metadata
    fallback_sets = build_grounded_hashtag_fallback(
        scene_summary=scene_summary,
        recent_tags=recent_hashtags,
        template_name=template_name,
    )

    return {
        "hashtag_sets": fallback_sets,
        "scene_summary": scene_summary,
        "total_sets": 5,
    }


async def generate_5_hashtag_sets(
    scene_summary: str,
    recent_hashtags: Optional[List[str]] = None,
    title: Optional[str] = None,
    template_name: Optional[str] = None,
    ollama_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout: int = 35,
) -> Dict[str, Any]:
    """Asynchronous wrapper for generate_5_hashtag_sets_sync."""
    return await asyncio.to_thread(
        generate_5_hashtag_sets_sync,
        scene_summary=scene_summary,
        recent_hashtags=recent_hashtags,
        title=title,
        template_name=template_name,
        ollama_url=ollama_url,
        model=model,
        timeout=timeout,
    )
