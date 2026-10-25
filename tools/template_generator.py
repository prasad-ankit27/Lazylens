"""
Template Generator for Lazylens
Programmatically generates 100+ diverse layout configurations across categories:
- Minimalist
- Film
- Editorial
- Scrapbook
- Polaroid

Enriches all templates with:
- sample_images: High-quality Unsplash placeholder URLs
- sample_text: Curated aesthetic text blocks
- Validates all layouts strictly against 1080x1350 boundaries and slot constraints
- Saves categorized object structure into architecture/preset_layouts.json
"""

import os
import sys
import json
import copy

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from typing import List, Dict, Any
from tools.validator import validate_layout_structure


UNSPLASH_SAMPLES = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1475921088770-99c522588e0b?auto=format&fit=crop&w=1080&q=80",
]

SAMPLE_TEXT_POOLS = {
    "Minimalist": [
        ["MOMENTS", "Paris, France"],
        ["FORM & SPACE", "Architectural Study // 04"],
        ["ESSENCE", "Quiet Observations"],
        ["EQUILIBRIUM", "Negative Space 2026"],
        ["STUDIO MONOCHROME", "Curated Series"],
        ["MODULAR", "Clean Angles & Light"],
    ],
    "Film": [
        ["DIRECTOR'S CUT", "35MM KODAK 500T"],
        ["ANALOG ARCHIVE", "REC ● [01:42:19] • 24 FPS"],
        ["PORTRA 400", "Tokyo Nocturne Series"],
        ["CINEMA VERITE", "Golden Hour 70mm"],
        ["GRAIN & SHADOW", "Kodak Tri-X 400 Exp. 24"],
        ["VINTAGE ROLL", "CineStill 800T • Nightwalks"],
    ],
    "Editorial": [
        ["AESTHETIC ARCHIVE", "VOL. 04 / ISSUE NO. 26"],
        ["LOOKBOOK 2026", "Autumn Haute Couture"],
        ["HAUTE HORIZONS", "Edition Milan / Paris"],
        ["DOLOMITES, ITALY", "46.4102° N, 11.8440° E"],
        ["VOGUE CURATED", "Minimalist Living Spaces"],
        ["TRAVEL JOURNAL", "Kyoto In Autumn"],
    ],
    "Scrapbook": [
        ["SUMMER MEMORIES", "Collected Moments 2026"],
        ["COLLAGE DIARIES", "Tape & Polaroid Artifacts"],
        ["POSTCARD FROM AMALFI", "Sunny Afternoon Walks"],
        ["WEEKEND ESCAPE", "Coffee & Polaroids"],
        ["JOURNAL NOTES", "Pages from July"],
        ["SCRAPBOOK VIBES", "Fleeting & Cherished"],
    ],
    "Polaroid": [
        ["INSTANT SNAPSHOT", "Fujifilm Instax Wide"],
        ["ORIGINAL POLAROID", "September 14, 2026"],
        ["SUNLIT FRAMES", "Warm Breeze & Smiles"],
        ["STUDIO POLAROID", "One of One Unique Print"],
        ["DUO POLAROID", "Friends in Florence"],
        ["FOUR CORNERS", "Instant Film Collection"],
    ],
}


def get_sample_images(count: int, offset: int = 0) -> List[str]:
    """Returns cyclical slice of high-quality Unsplash URLs."""
    res = []
    for i in range(count):
        idx = (offset + i) % len(UNSPLASH_SAMPLES)
        res.append(UNSPLASH_SAMPLES[idx])
    return res


def get_sample_text(category: str, index: int) -> List[str]:
    """Returns curated default text elements for the category."""
    pool = SAMPLE_TEXT_POOLS.get(category, SAMPLE_TEXT_POOLS["Minimalist"])
    return pool[index % len(pool)]


# --- Existing 10 Base Layouts Enriched ---
BASE_LAYOUTS = [
    {
        "layout_id": "grid_2x2",
        "name": "Balanced Quad (2x2)",
        "category": "Minimalist",
        "canvas": {
            "width": 1080,
            "height": 1350,
            "background_color": "#121214",
            "outer_margin": 24,
            "gutter": 16,
        },
        "slots": [
            {"slot_index": 0, "x": 24, "y": 24, "width": 508, "height": 643, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 1, "x": 548, "y": 24, "width": 508, "height": 643, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 2, "x": 24, "y": 683, "width": 508, "height": 643, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 3, "x": 548, "y": 683, "width": 508, "height": 643, "fit_mode": "cover", "border_radius": 12},
        ],
        "sample_images": get_sample_images(4, 0),
        "sample_text": ["MOMENTS", "Paris, France"],
    },
    {
        "layout_id": "hero_top_3_sub",
        "name": "Hero Header & Triptych (1 Top, 3 Bottom)",
        "category": "Minimalist",
        "canvas": {
            "width": 1080,
            "height": 1350,
            "background_color": "#121214",
            "outer_margin": 24,
            "gutter": 18,
        },
        "slots": [
            {"slot_index": 0, "x": 24, "y": 24, "width": 1032, "height": 830, "fit_mode": "cover", "border_radius": 16},
            {"slot_index": 1, "x": 24, "y": 872, "width": 332, "height": 454, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 2, "x": 374, "y": 872, "width": 332, "height": 454, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 3, "x": 724, "y": 872, "width": 332, "height": 454, "fit_mode": "cover", "border_radius": 12},
        ],
        "sample_images": get_sample_images(4, 4),
        "sample_text": ["HERO ARCHIVE", "Autumn Light Series"],
    },
    {
        "layout_id": "hero_left_3_stacked",
        "name": "Feature Split (1 Left Hero, 3 Right Stack)",
        "category": "Minimalist",
        "canvas": {
            "width": 1080,
            "height": 1350,
            "background_color": "#121214",
            "outer_margin": 24,
            "gutter": 18,
        },
        "slots": [
            {"slot_index": 0, "x": 24, "y": 24, "width": 640, "height": 1302, "fit_mode": "cover", "border_radius": 16},
            {"slot_index": 1, "x": 682, "y": 24, "width": 374, "height": 422, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 2, "x": 682, "y": 464, "width": 374, "height": 422, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 3, "x": 682, "y": 904, "width": 374, "height": 422, "fit_mode": "cover", "border_radius": 12},
        ],
        "sample_images": get_sample_images(4, 8),
        "sample_text": ["FEATURE SPLIT", "Nocturnal Rhythm"],
    },
    {
        "layout_id": "columns_4",
        "name": "Vertical Editorial Strips (4 Columns)",
        "category": "Minimalist",
        "canvas": {
            "width": 1080,
            "height": 1350,
            "background_color": "#121214",
            "outer_margin": 24,
            "gutter": 16,
        },
        "slots": [
            {"slot_index": 0, "x": 24, "y": 24, "width": 246, "height": 1302, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 1, "x": 286, "y": 24, "width": 246, "height": 1302, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 2, "x": 548, "y": 24, "width": 246, "height": 1302, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 3, "x": 810, "y": 24, "width": 246, "height": 1302, "fit_mode": "cover", "border_radius": 12},
        ],
        "sample_images": get_sample_images(4, 12),
        "sample_text": ["VERTICAL STRIPS", "Series 01"],
    },
    {
        "layout_id": "rows_4",
        "name": "Cinematic Letterbox (4 Rows)",
        "category": "Minimalist",
        "canvas": {
            "width": 1080,
            "height": 1350,
            "background_color": "#121214",
            "outer_margin": 24,
            "gutter": 14,
        },
        "slots": [
            {"slot_index": 0, "x": 24, "y": 24, "width": 1032, "height": 315, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 1, "x": 24, "y": 353, "width": 1032, "height": 315, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 2, "x": 24, "y": 682, "width": 1032, "height": 315, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 3, "x": 24, "y": 1011, "width": 1032, "height": 315, "fit_mode": "cover", "border_radius": 12},
        ],
        "sample_images": get_sample_images(4, 2),
        "sample_text": ["LETTERBOX 4-STACK", "24 FPS KODAK"],
    },
    {
        "layout_id": "airdrop_modal",
        "name": "AirDrop Modal",
        "category": "Editorial",
        "canvas": {
            "width": 1080,
            "height": 1350,
            "background_color": "#000000",
            "outer_margin": 16,
            "gutter": 16,
        },
        "slots": [
            {"slot_index": 0, "x": 16, "y": 16, "width": 516, "height": 651, "fit_mode": "cover", "border_radius": 16},
            {"slot_index": 1, "x": 548, "y": 16, "width": 516, "height": 651, "fit_mode": "cover", "border_radius": 16},
            {"slot_index": 2, "x": 16, "y": 683, "width": 516, "height": 651, "fit_mode": "cover", "border_radius": 16},
            {"slot_index": 3, "x": 548, "y": 683, "width": 516, "height": 651, "fit_mode": "cover", "border_radius": 16},
        ],
        "overlay": {
            "type": "airdrop",
            "config": {"device_name": "Lazylens iPhone", "photo_count": 4},
        },
        "sample_images": get_sample_images(4, 6),
        "sample_text": ["AirDrop", "Lazylens iPhone"],
    },
    {
        "layout_id": "wanderlust_pill",
        "name": "Wanderlust Pill",
        "category": "Editorial",
        "canvas": {
            "width": 1080,
            "height": 1350,
            "background_color": "#0d0f12",
            "outer_margin": 24,
            "gutter": 18,
        },
        "slots": [
            {"slot_index": 0, "x": 24, "y": 24, "width": 507, "height": 780, "fit_mode": "cover", "border_radius": 16},
            {"slot_index": 1, "x": 549, "y": 24, "width": 507, "height": 780, "fit_mode": "cover", "border_radius": 16},
            {"slot_index": 2, "x": 24, "y": 822, "width": 1032, "height": 504, "fit_mode": "cover", "border_radius": 16},
        ],
        "overlay": {
            "type": "location_pill",
            "config": {"location": "DOLOMITES, ITALY", "coordinates": "46.4102° N, 11.8440° E"},
        },
        "sample_images": get_sample_images(3, 10),
        "sample_text": ["DOLOMITES, ITALY", "46.4102° N, 11.8440° E"],
    },
    {
        "layout_id": "editorial_scrapbook",
        "name": "Editorial Scrapbook",
        "category": "Editorial",
        "canvas": {
            "width": 1080,
            "height": 1350,
            "background_color": "#F7F5F0",
            "outer_margin": 30,
            "gutter": 20,
        },
        "slots": [
            {"slot_index": 0, "x": 50, "y": 150, "width": 540, "height": 720, "fit_mode": "cover", "border_radius": 8},
            {"slot_index": 1, "x": 510, "y": 230, "width": 520, "height": 620, "fit_mode": "cover", "border_radius": 8},
            {"slot_index": 2, "x": 90, "y": 850, "width": 900, "height": 450, "fit_mode": "cover", "border_radius": 8},
        ],
        "overlay": {
            "type": "editorial_header",
            "config": {"issue": "VOL. 04 / ISSUE NO. 26", "title": "AESTHETIC ARCHIVE", "date": "AUTUMN 2026"},
        },
        "sample_images": get_sample_images(3, 14),
        "sample_text": ["AESTHETIC ARCHIVE", "VOL. 04 / ISSUE NO. 26"],
    },
    {
        "layout_id": "torn_strip_3",
        "name": "Torn Strips",
        "category": "Film",
        "canvas": {
            "width": 1080,
            "height": 1350,
            "background_color": "#121214",
            "outer_margin": 0,
            "gutter": 0,
        },
        "slots": [
            {"slot_index": 0, "x": 0, "y": 0, "width": 1080, "height": 470, "fit_mode": "cover", "border_radius": 0},
            {"slot_index": 1, "x": 0, "y": 440, "width": 1080, "height": 470, "fit_mode": "cover", "border_radius": 0},
            {"slot_index": 2, "x": 0, "y": 880, "width": 1080, "height": 470, "fit_mode": "cover", "border_radius": 0},
        ],
        "overlay": {
            "type": "torn_edges",
            "config": {"dividers": [455, 895]},
        },
        "sample_images": get_sample_images(3, 1),
        "sample_text": ["TORN HORIZONS", "Analog Moods"],
    },
    {
        "layout_id": "cinematic_letterbox",
        "name": "Cinematic Letterbox",
        "category": "Film",
        "canvas": {
            "width": 1080,
            "height": 1350,
            "background_color": "#000000",
            "outer_margin": 20,
            "gutter": 30,
        },
        "slots": [
            {"slot_index": 0, "x": 20, "y": 150, "width": 1040, "height": 510, "fit_mode": "cover", "border_radius": 4},
            {"slot_index": 1, "x": 20, "y": 690, "width": 1040, "height": 510, "fit_mode": "cover", "border_radius": 4},
        ],
        "overlay": {
            "type": "cinematic_subtitles",
            "config": {
                "subtitle": "— \"in the quiet between city lights, we found our rhythm\" —",
                "timecode": "REC ● [01:42:19]  •  35MM KODAK 500T",
            },
        },
        "sample_images": get_sample_images(2, 5),
        "sample_text": ["DIRECTOR'S CUT", "35MM KODAK 500T"],
    },
]


# ==========================================
# Programmatic Layout Generators (100+ Total)
# ==========================================

def generate_minimalist_presets() -> List[Dict[str, Any]]:
    """Generates ~25 minimalist grids, equal splits, and asymmetric modular layouts."""
    presets = []
    cw, ch = 1080, 1350

    # 1. 2x2 Grids with varied paddings & corner radii (8 variations)
    paddings = [16, 20, 28, 36, 44]
    gutters = [12, 16, 20, 24]
    bgs = ["#121214", "#09090b", "#18181b", "#0f172a", "#FAFAF9", "#F4F4F5"]

    for i in range(8):
        m = paddings[i % len(paddings)]
        g = gutters[i % len(gutters)]
        bg = bgs[i % len(bgs)]
        sw = (cw - 2 * m - g) // 2
        sh = (ch - 2 * m - g) // 2
        radius = 8 if i % 2 == 0 else 18
        pid = f"minimalist_grid_2x2_v{i+1}"
        preset = {
            "layout_id": pid,
            "name": f"Minimalist Quad Grid {i+1}",
            "category": "Minimalist",
            "canvas": {"width": cw, "height": ch, "background_color": bg, "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": radius},
                {"slot_index": 1, "x": m + sw + g, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": radius},
                {"slot_index": 2, "x": m, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": radius},
                {"slot_index": 3, "x": m + sw + g, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": radius},
            ],
            "sample_images": get_sample_images(4, i * 2),
            "sample_text": get_sample_text("Minimalist", i),
        }
        presets.append(preset)

    # 2. Vertical 2-splits (left/right portrait duo) (4 variations)
    for i in range(4):
        m = 24 + i * 8
        g = 16 + i * 4
        sw = (cw - 2 * m - g) // 2
        sh = ch - 2 * m
        pid = f"minimalist_duo_vert_v{i+1}"
        preset = {
            "layout_id": pid,
            "name": f"Vertical Diptych Duo {i+1}",
            "category": "Minimalist",
            "canvas": {"width": cw, "height": ch, "background_color": "#121214", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 12 + i * 4},
                {"slot_index": 1, "x": m + sw + g, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 12 + i * 4},
            ],
            "sample_images": get_sample_images(2, i * 3 + 1),
            "sample_text": get_sample_text("Minimalist", i + 1),
        }
        presets.append(preset)

    # 3. Horizontal 2-splits (top/bottom duo) (3 variations)
    for i in range(3):
        m = 24 + i * 10
        g = 20 + i * 6
        sw = cw - 2 * m
        sh = (ch - 2 * m - g) // 2
        pid = f"minimalist_duo_horiz_v{i+1}"
        preset = {
            "layout_id": pid,
            "name": f"Horizontal Landscape Duo {i+1}",
            "category": "Minimalist",
            "canvas": {"width": cw, "height": ch, "background_color": "#16161a", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 12},
                {"slot_index": 1, "x": m, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 12},
            ],
            "sample_images": get_sample_images(2, i * 4 + 2),
            "sample_text": get_sample_text("Minimalist", i + 2),
        }
        presets.append(preset)

    # 4. 3-Column Equal Strips (3 variations)
    for i in range(3):
        m = 20 + i * 8
        g = 14 + i * 4
        sw = (cw - 2 * m - 2 * g) // 3
        sh = ch - 2 * m
        pid = f"minimalist_tri_col_v{i+1}"
        preset = {
            "layout_id": pid,
            "name": f"Minimalist 3-Column Strip {i+1}",
            "category": "Minimalist",
            "canvas": {"width": cw, "height": ch, "background_color": "#0d0e12", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 10},
                {"slot_index": 1, "x": m + sw + g, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 10},
                {"slot_index": 2, "x": m + (sw + g) * 2, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 10},
            ],
            "sample_images": get_sample_images(3, i * 3 + 4),
            "sample_text": get_sample_text("Minimalist", i + 3),
        }
        presets.append(preset)

    # 5. 3-Row Equal Rows (3 variations)
    for i in range(3):
        m = 24 + i * 8
        g = 16 + i * 4
        sw = cw - 2 * m
        sh = (ch - 2 * m - 2 * g) // 3
        pid = f"minimalist_tri_row_v{i+1}"
        preset = {
            "layout_id": pid,
            "name": f"Minimalist 3-Row Letterbox {i+1}",
            "category": "Minimalist",
            "canvas": {"width": cw, "height": ch, "background_color": "#0a0a0c", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 8},
                {"slot_index": 1, "x": m, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 8},
                {"slot_index": 2, "x": m, "y": m + (sh + g) * 2, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 8},
            ],
            "sample_images": get_sample_images(3, i * 4 + 1),
            "sample_text": get_sample_text("Minimalist", i + 4),
        }
        presets.append(preset)

    # 6. Asymmetrical Modular Splits (Hero right, bottom hero, unequal quadrants) (4 variations)
    m = 24
    g = 18
    # Hero Right 2 Stacked Left
    hw = (cw - 2 * m - g) * 3 // 5
    sw = (cw - 2 * m - g) - hw
    sh = (ch - 2 * m - g) // 2
    presets.append({
        "layout_id": "minimalist_hero_right_2stack",
        "name": "Feature Split (Hero Right, 2 Stack Left)",
        "category": "Minimalist",
        "canvas": {"width": cw, "height": ch, "background_color": "#121214", "outer_margin": m, "gutter": g},
        "slots": [
            {"slot_index": 0, "x": m, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 1, "x": m, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 2, "x": m + sw + g, "y": m, "width": hw, "height": ch - 2 * m, "fit_mode": "cover", "border_radius": 16},
        ],
        "sample_images": get_sample_images(3, 5),
        "sample_text": get_sample_text("Minimalist", 0),
    })

    # Hero Bottom 2 Columns Top
    hh = (ch - 2 * m - g) * 3 // 5
    top_h = (ch - 2 * m - g) - hh
    top_w = (cw - 2 * m - g) // 2
    presets.append({
        "layout_id": "minimalist_hero_bottom_2col",
        "name": "Base Anchor (2 Top Cols, Hero Bottom)",
        "category": "Minimalist",
        "canvas": {"width": cw, "height": ch, "background_color": "#121214", "outer_margin": m, "gutter": g},
        "slots": [
            {"slot_index": 0, "x": m, "y": m, "width": top_w, "height": top_h, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 1, "x": m + top_w + g, "y": m, "width": top_w, "height": top_h, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 2, "x": m, "y": m + top_h + g, "width": cw - 2 * m, "height": hh, "fit_mode": "cover", "border_radius": 16},
        ],
        "sample_images": get_sample_images(3, 7),
        "sample_text": get_sample_text("Minimalist", 1),
    })

    # Center floating single focus with wide framing (2 slots)
    presets.append({
        "layout_id": "minimalist_focus_floating_duo",
        "name": "Floating Gallery Duo",
        "category": "Minimalist",
        "canvas": {"width": cw, "height": ch, "background_color": "#0a0a0c", "outer_margin": 48, "gutter": 24},
        "slots": [
            {"slot_index": 0, "x": 56, "y": 80, "width": 968, "height": 680, "fit_mode": "cover", "border_radius": 16},
            {"slot_index": 1, "x": 56, "y": 784, "width": 968, "height": 486, "fit_mode": "cover", "border_radius": 16},
        ],
        "sample_images": get_sample_images(2, 9),
        "sample_text": get_sample_text("Minimalist", 2),
    })

    # Asymmetric Pinwheel 4-piece
    presets.append({
        "layout_id": "minimalist_asym_pinwheel",
        "name": "Pinwheel Geometric 4-Block",
        "category": "Minimalist",
        "canvas": {"width": cw, "height": ch, "background_color": "#151518", "outer_margin": 24, "gutter": 16},
        "slots": [
            {"slot_index": 0, "x": 24, "y": 24, "width": 640, "height": 500, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 1, "x": 680, "y": 24, "width": 376, "height": 700, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 2, "x": 24, "y": 540, "width": 360, "height": 786, "fit_mode": "cover", "border_radius": 12},
            {"slot_index": 3, "x": 400, "y": 740, "width": 656, "height": 586, "fit_mode": "cover", "border_radius": 12},
        ],
        "sample_images": get_sample_images(4, 11),
        "sample_text": get_sample_text("Minimalist", 3),
    })

    return presets


def generate_film_presets() -> List[Dict[str, Any]]:
    """Generates ~25 cinematic, 35mm film strip, and letterbox presets."""
    presets = []
    cw, ch = 1080, 1350

    # 1. 35mm Film Strip Stack (3 frames) with dark cinema borders (6 variations)
    subtitles = [
        "— \"we wander across shadows where dreams stay awake\" —",
        "— \"in the quiet between city lights, we found our rhythm\" —",
        "— \"time slows down in neon reflections\" —",
        "— \"every frame holds a silent memory\" —",
        "— \"the story continues after dark\" —",
        "— \"analog heart in a digital world\" —",
    ]
    timecodes = [
        "REC ● [00:14:32] • 35MM KODAK 500T",
        "REC ● [01:02:18] • FUJIFILM ETERNA 250D",
        "REC ● [02:33:04] • ILFORD HP5 PLUS 400",
        "REC ● [00:48:55] • CINESTILL 800T • 24 FPS",
        "REC ● [01:19:40] • KODAK PORTRA 400",
        "REC ● [03:05:12] • 70MM PANAVISION",
    ]

    for i in range(6):
        m = 24 + i * 4
        g = 20 + i * 4
        sw = cw - 2 * m
        sh = (ch - 2 * m - 2 * g) // 3
        pid = f"film_strip_35mm_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"35mm Film Strip Frame {i+1}",
            "category": "Film",
            "canvas": {"width": cw, "height": ch, "background_color": "#08080a", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
                {"slot_index": 1, "x": m, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
                {"slot_index": 2, "x": m, "y": m + (sh + g) * 2, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
            ],
            "overlay": {
                "type": "cinematic_subtitles",
                "config": {"subtitle": subtitles[i], "timecode": timecodes[i]},
            },
            "sample_images": get_sample_images(3, i * 3),
            "sample_text": get_sample_text("Film", i),
        })

    # 2. Cinema Doublet Widescreen 2.39:1 (5 variations)
    for i in range(5):
        m = 30 + i * 6
        sh = 500 - i * 10
        y0 = 120 + i * 10
        y1 = y0 + sh + 50
        sw = cw - 2 * m
        pid = f"film_cinematic_doublet_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Panavision Widescreen Doublet {i+1}",
            "category": "Film",
            "canvas": {"width": cw, "height": ch, "background_color": "#050505", "outer_margin": m, "gutter": 40},
            "slots": [
                {"slot_index": 0, "x": m, "y": y0, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
                {"slot_index": 1, "x": m, "y": y1, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
            ],
            "overlay": {
                "type": "cinematic_subtitles",
                "config": {"subtitle": subtitles[(i + 2) % len(subtitles)], "timecode": timecodes[(i + 2) % len(timecodes)]},
            },
            "sample_images": get_sample_images(2, i * 4 + 1),
            "sample_text": get_sample_text("Film", i + 1),
        })

    # 3. 4-Frame Analog Contact Sheet (5 variations)
    for i in range(5):
        m = 20 + i * 4
        g = 16 + i * 2
        sw = (cw - 2 * m - g) // 2
        sh = (ch - 2 * m - g) // 2
        pid = f"film_contact_sheet_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Medium Format Contact Sheet {i+1}",
            "category": "Film",
            "canvas": {"width": cw, "height": ch, "background_color": "#0d0c0a", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 2},
                {"slot_index": 1, "x": m + sw + g, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 2},
                {"slot_index": 2, "x": m, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 2},
                {"slot_index": 3, "x": m + sw + g, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 2},
            ],
            "overlay": {
                "type": "cinematic_subtitles",
                "config": {"subtitle": f"— \"KODAK PORTRA 400 • FRAME 0{i+1}\" —", "timecode": "EXPOSURE +0.5 EV • ISO 400"},
            },
            "sample_images": get_sample_images(4, i * 2 + 3),
            "sample_text": get_sample_text("Film", i + 2),
        })

    # 4. Torn Film Strips with Jagged Edges (5 variations)
    for i in range(5):
        h0 = 420 + i * 15
        h1 = 440
        h2 = ch - h0 - h1
        pid = f"film_torn_strip_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Torn Film Negative Strip {i+1}",
            "category": "Film",
            "canvas": {"width": cw, "height": ch, "background_color": "#141312", "outer_margin": 0, "gutter": 0},
            "slots": [
                {"slot_index": 0, "x": 0, "y": 0, "width": cw, "height": h0 + 30, "fit_mode": "cover", "border_radius": 0},
                {"slot_index": 1, "x": 0, "y": h0, "width": cw, "height": h1 + 30, "fit_mode": "cover", "border_radius": 0},
                {"slot_index": 2, "x": 0, "y": h0 + h1, "width": cw, "height": h2, "fit_mode": "cover", "border_radius": 0},
            ],
            "overlay": {
                "type": "torn_edges",
                "config": {"dividers": [h0 + 15, h0 + h1 + 15]},
            },
            "sample_images": get_sample_images(3, i * 3 + 2),
            "sample_text": get_sample_text("Film", i + 3),
        })

    # 5. Dual Vertical 120 Roll Film Pillars (4 variations)
    for i in range(4):
        m = 32 + i * 8
        g = 24
        sw = (cw - 2 * m - g) // 2
        sh = ch - 2 * m
        pid = f"film_120_roll_duo_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"120 Medium Format Roll Duo {i+1}",
            "category": "Film",
            "canvas": {"width": cw, "height": ch, "background_color": "#0f0f11", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 6},
                {"slot_index": 1, "x": m + sw + g, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 6},
            ],
            "overlay": {
                "type": "cinematic_subtitles",
                "config": {"subtitle": "— HASSELBLAD 500C/M • 80MM F/2.8 —", "timecode": "KODAK TRI-X 400 • B&W"},
            },
            "sample_images": get_sample_images(2, i * 2 + 5),
            "sample_text": get_sample_text("Film", i + 4),
        })

    return presets


def generate_editorial_presets() -> List[Dict[str, Any]]:
    """Generates ~25 high-fashion magazine, travel wanderlust, and lookbook layouts."""
    presets = []
    cw, ch = 1080, 1350

    issues = ["VOL. 04 / ISSUE NO. 26", "VOL. 08 / SPECIAL EDITION", "ISSUE NO. 14 / AUTUMN", "VOL. 02 / MONOCHROME", "ISSUE NO. 09 / MILAN"]
    titles = ["AESTHETIC ARCHIVE", "MODERN ARCHITECTURE", "HAUTE HORIZONS", "MINIMALIST FORMS", "CONTEMPORARY LIVING"]
    dates = ["AUTUMN 2026", "SPRING / SUMMER 2026", "WINTER EDIT 2026", "OCTOBER 2026", "DECEMBER 2026"]

    # 1. Magazine Cover Hero + 2 Footers (6 variations)
    for i in range(6):
        m = 24 + i * 6
        g = 18
        hero_h = 780 - i * 15
        foot_h = ch - 2 * m - g - hero_h
        foot_w = (cw - 2 * m - g) // 2
        bg = "#F7F5F0" if i % 2 == 0 else "#141416"
        pid = f"editorial_magazine_cover_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Magazine Editorial Cover {i+1}",
            "category": "Editorial",
            "canvas": {"width": cw, "height": ch, "background_color": bg, "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m + 80, "width": cw - 2 * m, "height": hero_h - 80, "fit_mode": "cover", "border_radius": 8},
                {"slot_index": 1, "x": m, "y": m + hero_h + g, "width": foot_w, "height": foot_h, "fit_mode": "cover", "border_radius": 8},
                {"slot_index": 2, "x": m + foot_w + g, "y": m + hero_h + g, "width": foot_w, "height": foot_h, "fit_mode": "cover", "border_radius": 8},
            ],
            "overlay": {
                "type": "editorial_header",
                "config": {"issue": issues[i % len(issues)], "title": titles[i % len(titles)], "date": dates[i % len(dates)]},
            },
            "sample_images": get_sample_images(3, i * 3 + 1),
            "sample_text": get_sample_text("Editorial", i),
        })

    # 2. Wanderlust Travel Pill Variants (6 variations)
    locations = [
        ("DOLOMITES, ITALY", "46.4102° N, 11.8440° E"),
        ("KYOTO, JAPAN", "35.0116° N, 135.7681° E"),
        ("SANTORINI, GREECE", "36.3932° N, 25.4615° E"),
        ("REYKJAVIK, ICELAND", "64.1466° N, 21.9426° W"),
        ("AMALFI COAST, ITALY", "40.6340° N, 14.6027° E"),
        ("ZERMATT, SWITZERLAND", "45.9765° N, 7.7491° E"),
    ]
    for i in range(6):
        loc, coords = locations[i]
        m = 24
        g = 18
        top_h = 750 + i * 15
        bot_h = ch - 2 * m - g - top_h
        pid = f"editorial_wanderlust_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Wanderlust Pill {loc.split(',')[0]}",
            "category": "Editorial",
            "canvas": {"width": cw, "height": ch, "background_color": "#0d0f12", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": (cw - 2 * m - g) // 2, "height": top_h, "fit_mode": "cover", "border_radius": 16},
                {"slot_index": 1, "x": m + (cw - 2 * m - g) // 2 + g, "y": m, "width": (cw - 2 * m - g) // 2, "height": top_h, "fit_mode": "cover", "border_radius": 16},
                {"slot_index": 2, "x": m, "y": m + top_h + g, "width": cw - 2 * m, "height": bot_h, "fit_mode": "cover", "border_radius": 16},
            ],
            "overlay": {
                "type": "location_pill",
                "config": {"location": loc, "coordinates": coords},
            },
            "sample_images": get_sample_images(3, i * 4 + 2),
            "sample_text": [loc, coords],
        })

    # 3. Vogue Split-Page Asymmetrical Lookbook (5 variations)
    for i in range(5):
        m = 32
        g = 20
        lw = 580 - i * 20
        rw = cw - 2 * m - g - lw
        sh = (ch - 2 * m - g) // 2
        bg = "#F5F2EB" if i % 2 == 0 else "#101012"
        pid = f"editorial_vogue_split_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Vogue Split Editorial {i+1}",
            "category": "Editorial",
            "canvas": {"width": cw, "height": ch, "background_color": bg, "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": lw, "height": ch - 2 * m, "fit_mode": "cover", "border_radius": 8},
                {"slot_index": 1, "x": m + lw + g, "y": m, "width": rw, "height": sh, "fit_mode": "cover", "border_radius": 8},
                {"slot_index": 2, "x": m + lw + g, "y": m + sh + g, "width": rw, "height": sh, "fit_mode": "cover", "border_radius": 8},
            ],
            "overlay": {
                "type": "editorial_header",
                "config": {"issue": f"LOOKBOOK // 2026.0{i+1}", "title": "CONTEMPORARY FORMS", "date": "MILAN / PARIS"},
            },
            "sample_images": get_sample_images(3, i * 3 + 3),
            "sample_text": get_sample_text("Editorial", i + 1),
        })

    # 4. AirDrop Card Sharing Layouts (4 variations)
    devices = ["Lazylens iPhone", "Studio MacBook Pro", "Sophie's iPad", "Milan Creative Suite"]
    for i in range(4):
        m = 20
        g = 16
        sw = (cw - 2 * m - g) // 2
        sh = (ch - 2 * m - g) // 2
        pid = f"editorial_airdrop_card_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"AirDrop Card Showcase {i+1}",
            "category": "Editorial",
            "canvas": {"width": cw, "height": ch, "background_color": "#000000", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 16},
                {"slot_index": 1, "x": m + sw + g, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 16},
                {"slot_index": 2, "x": m, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 16},
                {"slot_index": 3, "x": m + sw + g, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 16},
            ],
            "overlay": {
                "type": "airdrop",
                "config": {"device_name": devices[i], "photo_count": 4},
            },
            "sample_images": get_sample_images(4, i * 4),
            "sample_text": ["AirDrop", devices[i]],
        })

    # 5. Editorial Triptych with Center Focus (4 variations)
    for i in range(4):
        m = 24
        g = 16
        flank_w = 260 + i * 20
        center_w = cw - 2 * m - 2 * g - 2 * flank_w
        pid = f"editorial_triptych_center_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Editorial Triptych Focus {i+1}",
            "category": "Editorial",
            "canvas": {"width": cw, "height": ch, "background_color": "#181716", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": flank_w, "height": ch - 2 * m, "fit_mode": "cover", "border_radius": 10},
                {"slot_index": 1, "x": m + flank_w + g, "y": m, "width": center_w, "height": ch - 2 * m, "fit_mode": "cover", "border_radius": 14},
                {"slot_index": 2, "x": m + flank_w + center_w + 2 * g, "y": m, "width": flank_w, "height": ch - 2 * m, "fit_mode": "cover", "border_radius": 10},
            ],
            "sample_images": get_sample_images(3, i * 3 + 5),
            "sample_text": get_sample_text("Editorial", i + 2),
        })

    return presets


def generate_scrapbook_presets() -> List[Dict[str, Any]]:
    """Generates ~25 organic asymmetrical scrapbooks, collage grids, and journal pages."""
    presets = []
    cw, ch = 1080, 1350

    bgs = ["#181716", "#201E1C", "#ECE8DF", "#F7F5F0", "#1C1B20", "#141416"]

    # 1. Asymmetric 3-Piece Staggered Collage (8 variations)
    offsets = [
        (40, 60, 580, 720, 500, 140, 540, 640, 80, 820, 920, 480),
        (50, 80, 540, 680, 520, 200, 510, 620, 60, 840, 960, 460),
        (30, 40, 600, 740, 520, 120, 520, 660, 100, 860, 880, 440),
        (60, 100, 520, 700, 480, 160, 540, 640, 50, 850, 980, 450),
        (40, 50, 560, 700, 480, 180, 560, 620, 70, 820, 940, 480),
        (70, 80, 500, 720, 510, 100, 500, 700, 90, 860, 900, 440),
        (40, 100, 620, 660, 540, 220, 500, 580, 60, 840, 960, 460),
        (50, 60, 580, 740, 490, 150, 540, 650, 80, 850, 920, 450),
    ]

    for i in range(8):
        x0, y0, w0, h0, x1, y1, w1, h1, x2, y2, w2, h2 = offsets[i]
        bg = bgs[i % len(bgs)]
        pid = f"scrapbook_collage_3asym_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Asymmetrical Scrapbook Collage {i+1}",
            "category": "Scrapbook",
            "canvas": {"width": cw, "height": ch, "background_color": bg, "outer_margin": 30, "gutter": 20},
            "slots": [
                {"slot_index": 0, "x": x0, "y": y0, "width": w0, "height": h0, "fit_mode": "cover", "border_radius": 12},
                {"slot_index": 1, "x": x1, "y": y1, "width": w1, "height": h1, "fit_mode": "cover", "border_radius": 12},
                {"slot_index": 2, "x": x2, "y": y2, "width": w2, "height": h2, "fit_mode": "cover", "border_radius": 12},
            ],
            "sample_images": get_sample_images(3, i * 3),
            "sample_text": get_sample_text("Scrapbook", i),
        })

    # 2. Moodboard 4-Piece Creative Composition (8 variations)
    for i in range(8):
        m = 24 + i * 4
        g = 16
        w_left = 500 - i * 15
        w_right = cw - 2 * m - g - w_left
        h_top_l = 620 + i * 10
        h_bot_l = ch - 2 * m - g - h_top_l
        h_top_r = 540 - i * 10
        h_bot_r = ch - 2 * m - g - h_top_r

        pid = f"scrapbook_moodboard_4box_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Artist Moodboard Composition {i+1}",
            "category": "Scrapbook",
            "canvas": {"width": cw, "height": ch, "background_color": "#1c1b1a", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": w_left, "height": h_top_l, "fit_mode": "cover", "border_radius": 14},
                {"slot_index": 1, "x": m + w_left + g, "y": m, "width": w_right, "height": h_top_r, "fit_mode": "cover", "border_radius": 14},
                {"slot_index": 2, "x": m, "y": m + h_top_l + g, "width": w_left, "height": h_bot_l, "fit_mode": "cover", "border_radius": 14},
                {"slot_index": 3, "x": m + w_left + g, "y": m + h_top_r + g, "width": w_right, "height": h_bot_r, "fit_mode": "cover", "border_radius": 14},
            ],
            "sample_images": get_sample_images(4, i * 2 + 1),
            "sample_text": get_sample_text("Scrapbook", i + 1),
        })

    # 3. Travel Journal Diagonal Stepping Collage (5 variations)
    for i in range(5):
        m = 28
        step_w = 640
        step_h = 390
        pid = f"scrapbook_diagonal_step_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Staggered Travel Stair Collage {i+1}",
            "category": "Scrapbook",
            "canvas": {"width": cw, "height": ch, "background_color": "#161514", "outer_margin": m, "gutter": 20},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": step_w, "height": step_h, "fit_mode": "cover", "border_radius": 16},
                {"slot_index": 1, "x": cw - m - step_w, "y": m + step_h + 30, "width": step_w, "height": step_h, "fit_mode": "cover", "border_radius": 16},
                {"slot_index": 2, "x": m + 50, "y": m + (step_h + 30) * 2, "width": step_w, "height": step_h, "fit_mode": "cover", "border_radius": 16},
            ],
            "sample_images": get_sample_images(3, i * 3 + 2),
            "sample_text": get_sample_text("Scrapbook", i + 2),
        })

    # 4. Craft Paper Duo Postcard Spread (4 variations)
    for i in range(4):
        m = 36
        sw = 960
        sh = 580
        pid = f"scrapbook_postcard_duo_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Postcard Artisan Duo {i+1}",
            "category": "Scrapbook",
            "canvas": {"width": cw, "height": ch, "background_color": "#22201d", "outer_margin": m, "gutter": 30},
            "slots": [
                {"slot_index": 0, "x": 60, "y": 70 + i * 10, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 8},
                {"slot_index": 1, "x": 60, "y": 700 + i * 10, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 8},
            ],
            "sample_images": get_sample_images(2, i * 4 + 3),
            "sample_text": get_sample_text("Scrapbook", i + 3),
        })

    return presets


def generate_polaroid_presets() -> List[Dict[str, Any]]:
    """Generates ~25 authentic bottom-heavy Polaroid and instant print layouts."""
    presets = []
    cw, ch = 1080, 1350

    bgs = ["#0a0a0c", "#181716", "#1c1b1f", "#0e0e10", "#FAFAF9"]

    # 1. Twin Stacked Polaroids (vertical duo) (6 variations)
    for i in range(6):
        m = 32 + i * 4
        sw = 960 - i * 10
        sh = 570 - i * 10
        bg = bgs[i % len(bgs)]
        pid = f"polaroid_duo_stack_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Instant Film Twin Stack {i+1}",
            "category": "Polaroid",
            "canvas": {"width": cw, "height": ch, "background_color": bg, "outer_margin": m, "gutter": 30},
            "slots": [
                {"slot_index": 0, "x": (cw - sw) // 2, "y": 60 + i * 8, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
                {"slot_index": 1, "x": (cw - sw) // 2, "y": 680 + i * 8, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
            ],
            "sample_images": get_sample_images(2, i * 3),
            "sample_text": get_sample_text("Polaroid", i),
        })

    # 2. Side-by-Side Dual Polaroids (6 variations)
    for i in range(6):
        m = 32 + i * 4
        g = 24 + i * 4
        sw = (cw - 2 * m - g) // 2
        sh = 850 + i * 15
        y_pos = (ch - sh) // 2
        pid = f"polaroid_side_by_side_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Side-by-Side Instant Duo {i+1}",
            "category": "Polaroid",
            "canvas": {"width": cw, "height": ch, "background_color": "#121214", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": y_pos, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
                {"slot_index": 1, "x": m + sw + g, "y": y_pos, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
            ],
            "sample_images": get_sample_images(2, i * 2 + 1),
            "sample_text": get_sample_text("Polaroid", i + 1),
        })

    # 3. 3-Snap Vertical Polaroid Film Strip (5 variations)
    for i in range(5):
        m = 36 + i * 4
        g = 24
        sw = cw - 2 * m
        sh = (ch - 2 * m - 2 * g) // 3
        pid = f"polaroid_tri_snap_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"3-Snap Polaroid Strip {i+1}",
            "category": "Polaroid",
            "canvas": {"width": cw, "height": ch, "background_color": "#09090b", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
                {"slot_index": 1, "x": m, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
                {"slot_index": 2, "x": m, "y": m + (sh + g) * 2, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
            ],
            "sample_images": get_sample_images(3, i * 3 + 2),
            "sample_text": get_sample_text("Polaroid", i + 2),
        })

    # 4. Polaroid 4-Card Salon Wall (4 variations)
    for i in range(4):
        m = 36 + i * 6
        g = 28 + i * 4
        sw = (cw - 2 * m - g) // 2
        sh = (ch - 2 * m - g) // 2
        pid = f"polaroid_salon_4grid_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Polaroid Salon Wall 4-Grid {i+1}",
            "category": "Polaroid",
            "canvas": {"width": cw, "height": ch, "background_color": "#161619", "outer_margin": m, "gutter": g},
            "slots": [
                {"slot_index": 0, "x": m, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
                {"slot_index": 1, "x": m + sw + g, "y": m, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
                {"slot_index": 2, "x": m, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
                {"slot_index": 3, "x": m + sw + g, "y": m + sh + g, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 4},
            ],
            "sample_images": get_sample_images(4, i * 4 + 1),
            "sample_text": get_sample_text("Polaroid", i + 3),
        })

    # 5. Staggered Snapshot Pair (offset organic angle feel) (4 variations)
    for i in range(4):
        sw = 640
        sh = 680
        pid = f"polaroid_staggered_pair_v{i+1}"
        presets.append({
            "layout_id": pid,
            "name": f"Staggered Instant Print Pair {i+1}",
            "category": "Polaroid",
            "canvas": {"width": cw, "height": ch, "background_color": "#141416", "outer_margin": 32, "gutter": 20},
            "slots": [
                {"slot_index": 0, "x": 48 + i * 8, "y": 60, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 6},
                {"slot_index": 1, "x": cw - sw - 48 - i * 8, "y": 600, "width": sw, "height": sh, "fit_mode": "cover", "border_radius": 6},
            ],
            "sample_images": get_sample_images(2, i * 3 + 4),
            "sample_text": get_sample_text("Polaroid", i + 4),
        })

    return presets


def generate_all_presets() -> Dict[str, Any]:
    """
    Generates all preset categories, validates each preset,
    and returns categorized object + flat presets array.
    """
    categories = {
        "Minimalist": [],
        "Film": [],
        "Editorial": [],
        "Scrapbook": [],
        "Polaroid": [],
    }

    # 1. Add base layouts into their respective categories
    for base in BASE_LAYOUTS:
        cat = base.get("category", "Minimalist")
        categories[cat].append(base)

    # 2. Add programmatically generated layouts
    generated_minimalist = generate_minimalist_presets()
    generated_film = generate_film_presets()
    generated_editorial = generate_editorial_presets()
    generated_scrapbook = generate_scrapbook_presets()
    generated_polaroid = generate_polaroid_presets()

    categories["Minimalist"].extend(generated_minimalist)
    categories["Film"].extend(generated_film)
    categories["Editorial"].extend(generated_editorial)
    categories["Scrapbook"].extend(generated_scrapbook)
    categories["Polaroid"].extend(generated_polaroid)

    # 3. Validate every single preset strictly
    all_flat = []
    seen_ids = set()

    for cat_name, p_list in categories.items():
        for p in p_list:
            pid = p["layout_id"]
            if pid in seen_ids:
                raise ValueError(f"Duplicate layout_id detected: {pid}")
            seen_ids.add(pid)

            # Strict boundary validation
            validate_layout_structure(p)

            # Ensure sample_images and sample_text exist
            if not p.get("sample_images") or len(p["sample_images"]) < len(p["slots"]):
                p["sample_images"] = get_sample_images(len(p["slots"]))
            if not p.get("sample_text"):
                p["sample_text"] = get_sample_text(cat_name, len(all_flat))

            all_flat.append(p)

    return {
        "$schema": "./layout_schema.json",
        "categories": categories,
        "Categories": categories,
        "presets": all_flat,
    }


def write_presets_file(output_path: str = "architecture/preset_layouts.json") -> int:
    """
    Executes layout generation and saves to the specified preset_layouts.json path.
    """
    data = generate_all_presets()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    total_count = len(data["presets"])
    print(f"[Success] Generated {total_count} layout templates across {len(data['categories'])} categories.")
    for cat, items in data["categories"].items():
        print(f"  - {cat}: {len(items)} templates")
    print(f"Saved to: {output_path}")
    return total_count


if __name__ == "__main__":
    write_presets_file()
