"""
Validator Module for Lazylens
Validates layouts, canvas boundaries, and render payloads against architecture schemas.
"""

from typing import Dict, Any, List
import json
import os


def validate_layout_structure(layout: Dict[str, Any]) -> None:
    """
    Validates that a layout conforms to boundary rules:
    - Exactly 4 slots
    - Canvas is 1080x1350
    - No slot exceeds canvas dimensions
    - No slot has non-positive width/height
    """
    canvas = layout.get("canvas", {})
    cw = canvas.get("width", 1080)
    ch = canvas.get("height", 1350)

    if cw != 1080 or ch != 1350:
        raise ValueError(f"Canvas dimensions must strictly be 1080x1350. Received {cw}x{ch}")

    slots: List[Dict[str, Any]] = layout.get("slots", [])
    if len(slots) < 2 or len(slots) > 4:
        raise ValueError(f"Layout must contain between 2 and 4 slots. Found {len(slots)}")

    slot_indices = set()
    for s in slots:
        idx = s.get("slot_index")
        if idx is None or idx < 0 or idx > 3:
            raise ValueError(f"Invalid slot_index: {idx}. Must be 0, 1, 2, or 3.")
        if idx in slot_indices:
            raise ValueError(f"Duplicate slot_index {idx} detected.")
        slot_indices.add(idx)

        x, y = s.get("x", 0), s.get("y", 0)
        w, h = s.get("width", 0), s.get("height", 0)

        if w <= 0 or h <= 0:
            raise ValueError(f"Slot {idx} has invalid dimensions {w}x{h}.")
        if x < 0 or y < 0:
            raise ValueError(f"Slot {idx} has negative coordinates ({x}, {y}).")
        if (x + w) > cw or (y + h) > ch:
            raise ValueError(
                f"Slot {idx} bounds ({x + w}, {y + h}) exceed canvas dimensions ({cw}, {ch})."
            )


def get_all_presets_from_data(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extracts all preset layouts from either a categorized dictionary or flat array.
    """
    if "presets" in data and isinstance(data["presets"], list) and data["presets"]:
        return data["presets"]

    presets = []
    cats = data.get("categories") or data.get("Categories") or {}
    if isinstance(cats, dict):
        for cat_list in cats.values():
            if isinstance(cat_list, list):
                presets.extend(cat_list)
    return presets


def load_preset_layout(presets_path: str, layout_id: str) -> Dict[str, Any]:
    """
    Loads and validates a layout preset by its identifier from presets JSON file.
    Supports both categorized object structure and flat presets array.
    """
    if not os.path.exists(presets_path):
        raise FileNotFoundError(f"Presets file not found at: {presets_path}")

    with open(presets_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    presets = get_all_presets_from_data(data)
    for preset in presets:
        if preset.get("layout_id") == layout_id:
            validate_layout_structure(preset)
            return preset

    available = [p.get("layout_id") for p in presets]
    raise KeyError(f"Layout '{layout_id}' not found. Available presets: {available}")

