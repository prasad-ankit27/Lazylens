"""
Template Recommendation Module for LazyLens
Analyzes the collective mood, lighting, color palette, and composition of slide images
and recommends 4-5 relevant templates from the existing preset layouts library.
"""

import os
import json
import re
from typing import List, Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRESETS_FILE = os.getenv("PRESETS_FILE", os.path.join(BASE_DIR, "architecture", "preset_layouts.json"))
FALLBACK_PRESETS_FILE = os.path.join(BASE_DIR, "frontend", "app", "preset_layouts.json")


def load_all_presets(presets_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Loads all presets from disk."""
    candidate_paths = [
        presets_path,
        PRESETS_FILE,
        FALLBACK_PRESETS_FILE,
        os.path.join(BASE_DIR, "preset_layouts.json"),
    ]
    for p in candidate_paths:
        if p and os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    presets = data.get("presets", [])
                    if presets:
                        return presets
            except Exception as e:
                print(f"[Recommender Warning] Could not load presets from {p}: {e}")
    return []


def determine_aesthetic_style(scene_text: str) -> Dict[str, float]:
    """
    Evaluates semantic style affinity based on scene summary keywords
    (lighting, mood, setting, subject, color).
    """
    text = (scene_text or "").lower()

    scores = {
        "Film": 0.0,
        "Minimalist": 0.0,
        "Editorial": 0.0,
        "Scrapbook": 0.0,
        "Polaroid": 0.0,
    }

    # Film / Vintage cues
    if any(k in text for k in ["warm", "amber", "red", "candle", "night", "neon", "shadow", "glow", "analog", "vintage", "nostalg"]):
        scores["Film"] += 3.5
        scores["Polaroid"] += 2.5

    # Minimalist / Clean cues
    if any(k in text for k in ["clean", "minimal", "sleek", "modern", "quiet", "simple", "architecture", "monochrome", "serene", "soft"]):
        scores["Minimalist"] += 3.5
        scores["Editorial"] += 2.0

    # Editorial / Fashion cues
    if any(k in text for k in ["fashion", "portrait", "chic", "dress", "outfit", "model", "stylish", "magazine", "contrast", "luxury"]):
        scores["Editorial"] += 3.8
        scores["Minimalist"] += 2.2

    # Scrapbook / Travel / Lifestyle cues
    if any(k in text for k in ["friends", "food", "dining", "laugh", "table", "cafe", "travel", "vacation", "gathering", "fun"]):
        scores["Scrapbook"] += 3.5
        scores["Polaroid"] += 2.8

    # Polaroid / Casual cues
    if any(k in text for k in ["casual", "intimate", "moment", "snapshot", "smile", "drink", "street"]):
        scores["Polaroid"] += 3.0
        scores["Film"] += 2.0

    return scores


def generate_match_reason(preset: Dict[str, Any], scene_summary: str, photo_count: int) -> str:
    """Generates a concise aesthetic rationale for why this template matches the collection."""
    name = preset.get("name", "Layout")
    cat = preset.get("category", "Minimalist")
    slot_count = len(preset.get("slots", []))
    summary_lower = (scene_summary or "").lower()

    if cat == "Film" or cat == "Polaroid":
        if "warm" in summary_lower or "night" in summary_lower:
            return f"Warm vintage framing that accentuates the ambient lighting and mood across all {slot_count} frames."
        return f"Retro cinematic styling suited for authentic, unfiltered moments."

    if cat == "Editorial":
        if "portrait" in summary_lower or "fashion" in summary_lower or "stylish" in summary_lower:
            return f"Magazine-inspired editorial composition highlighting portrait hierarchy."
        return f"High-contrast editorial layout with structured negative space."

    if cat == "Scrapbook":
        if "food" in summary_lower or "friends" in summary_lower:
            return f"Playful, layered collage feel ideal for shared dining and hangout memories."
        return f"Layered lifestyle composition highlighting spontaneous moments."

    # Minimalist default
    if slot_count == photo_count:
        return f"Balanced {slot_count}-photo grid with clean lines and focus on subject composition."
    return f"Curated minimalist layout offering visual rhythm and breathing room."


def suggest_templates_sync(
    images: List[str],
    current_layout_id: str,
    recent_template_ids: Optional[List[str]] = None,
    scene_summary: Optional[str] = None,
    photo_count: Optional[int] = None,
    presets_file: Optional[str] = None,
    ollama_url: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Recommends 4-5 relevant templates from the existing preset layouts library
    matching the collective visual aesthetic, mood, and photo count of current slide images.
    """
    all_presets = load_all_presets(presets_file)
    if not all_presets:
        raise ValueError("No templates found in library.")

    recents = set(recent_template_ids or [])
    curr_id = (current_layout_id or "").strip()

    # 1. Obtain or reuse scene analysis
    summary = scene_summary
    if not summary and images:
        try:
            from tools.vision import analyze_multiscene_sync
            summary = analyze_multiscene_sync(images, ollama_url=ollama_url)
        except Exception as e:
            print(f"[Recommender Warning] Vision scene extraction skipped: {e}")
            summary = "A curated collection of photos captured with thoughtful composition and balanced lighting."

    # Determine photo count from images or argument
    count = photo_count or (len(images) if images else 4)

    # 2. Evaluate aesthetic style scores
    style_scores = determine_aesthetic_style(summary or "")

    # 3. Filter and score candidate presets
    scored_candidates = []
    for preset in all_presets:
        pid = preset.get("layout_id")
        if not pid or pid == curr_id:
            continue  # Do not suggest the currently active layout

        slots = preset.get("slots", [])
        slot_len = len(slots)
        cat = preset.get("category", "Minimalist")

        # Score components:
        # Base score from slot count match:
        score = 0.0
        if slot_len == count:
            score += 50.0  # Perfect slot match
        elif abs(slot_len - count) == 1:
            score += 20.0  # Close slot match (e.g. 3 vs 4)
        else:
            score += 5.0

        # Category style score:
        cat_bonus = style_scores.get(cat, 1.0)
        score += cat_bonus * 10.0

        # Penalize recently recommended templates for variety
        if pid in recents:
            score -= 30.0

        scored_candidates.append({
            "preset": preset,
            "score": score,
            "category": cat,
        })

    # Sort descending by score
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)

    # 4. Select top 4-5 diverse candidates
    selected: List[Dict[str, Any]] = []
    seen_ids = set()
    category_counts: Dict[str, int] = {}

    # First pass: try to include diverse categories while picking high scores
    for cand in scored_candidates:
        if len(selected) >= 5:
            break
        p = cand["preset"]
        pid = p["layout_id"]
        cat = cand["category"]

        if pid in seen_ids:
            continue

        # Prevent more than 2 presets from the same category unless needed
        if category_counts.get(cat, 0) >= 2 and len(selected) < 4:
            continue

        seen_ids.add(pid)
        category_counts[cat] = category_counts.get(cat, 0) + 1

        reason = generate_match_reason(p, summary or "", count)
        selected.append({
            "layout_id": pid,
            "name": p.get("name", pid),
            "category": cat,
            "photo_count": len(p.get("slots", [])),
            "match_reason": reason,
            "score": round(cand["score"], 1),
            "preset": p,
        })

    # If fewer than 4, fill from remaining top candidates
    if len(selected) < 4:
        for cand in scored_candidates:
            if len(selected) >= 4:
                break
            p = cand["preset"]
            pid = p["layout_id"]
            if pid not in seen_ids:
                seen_ids.add(pid)
                selected.append({
                    "layout_id": pid,
                    "name": p.get("name", pid),
                    "category": cand["category"],
                    "photo_count": len(p.get("slots", [])),
                    "match_reason": generate_match_reason(p, summary or "", count),
                    "score": round(cand["score"], 1),
                    "preset": p,
                })

    return {
        "success": True,
        "recommendations": selected,
        "scene_summary": summary,
        "total": len(selected),
    }


if __name__ == "__main__":
    demo_images = ["frontend/public/demo/demo1.jpg", "frontend/public/demo/demo2.jpg"]
    res = suggest_templates_sync(
        images=demo_images,
        current_layout_id="grid_2x2",
        scene_summary="Warm ambient restaurant with friends dining under red and amber lantern lighting.",
        photo_count=4,
    )
    print("Recommendations count:", len(res["recommendations"]))
    for r in res["recommendations"]:
        print(f"- [{r['category']}] {r['name']} ({r['layout_id']}): {r['match_reason']}")
