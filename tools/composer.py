"""
Composer Module for Lazylens
Deterministic Pillow-based image composition engine.
Merges user photos into predefined JSON layout structures on a 1080x1350 canvas.
Supports modern aesthetic presets with procedural UI overlays, torn paper masks,
AirDrop cards, location pills, and cinematic letterbox subtitles.
Zero AI generative models; 100% geometric and procedural image processing.
"""

from typing import List, Dict, Any, Optional, Tuple, Union
import os
import math
import uuid
import json
import zipfile
from PIL import Image, ImageOps, ImageColor, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from tools.geometry import calculate_cover_crop, create_rounded_mask
from tools.validator import validate_layout_structure


def apply_auto_enhance(img: Image.Image) -> Image.Image:
    """
    Mathematically boosts image aesthetics deterministically using Pillow:
    - Color (saturation) +15% (1.15)
    - Contrast +10% (1.10)
    - Sharpness +20% (1.20)
    """
    enhanced = ImageEnhance.Color(img).enhance(1.15)
    enhanced = ImageEnhance.Contrast(enhanced).enhance(1.10)
    enhanced = ImageEnhance.Sharpness(enhanced).enhance(1.20)
    return enhanced


def hex_to_rgba(hex_code: str) -> tuple:
    """Converts hex color string (#RGB, #RRGGBB, #RRGGBBAA) to RGBA tuple."""
    try:
        rgb = ImageColor.getrgb(hex_code)
        if len(rgb) == 3:
            return (rgb[0], rgb[1], rgb[2], 255)
        return rgb
    except Exception:
        return (18, 18, 20, 255)


def get_font(size: int = 24, font_name: str = "", bold: bool = False, mono: bool = False) -> ImageFont.ImageFont:
    """
    Loads appropriate system font based on font_name and style with fallback to Pillow default.
    """
    fn = (font_name or "").lower()
    candidates = []

    # Map candidate categories
    if any(k in fn for k in ["serif", "playfair", "cormorant", "dm serif", "abril"]):
        candidates = [
            "C:\\Windows\\Fonts\\georgiab.ttf" if bold else "C:\\Windows\\Fonts\\georgia.ttf",
            "C:\\Windows\\Fonts\\timesbd.ttf" if bold else "C:\\Windows\\Fonts\\times.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        ]
    elif any(k in fn for k in ["caveat", "patrick", "kalam", "hand"]):
        candidates = [
            "C:\\Windows\\Fonts\\segoeprb.ttf" if bold else "C:\\Windows\\Fonts\\segoepr.ttf",
            "C:\\Windows\\Fonts\\comicbd.ttf" if bold else "C:\\Windows\\Fonts\\comic.ttf",
        ]
    elif any(k in fn for k in ["vibes", "allura", "sacramento", "script", "calligraphy"]):
        candidates = [
            "C:\\Windows\\Fonts\\segoescb.ttf" if bold else "C:\\Windows\\Fonts\\segoesc.ttf",
            "C:\\Windows\\Fonts\\segoeprb.ttf",
        ]
    elif any(k in fn for k in ["bebas", "anton", "oswald", "impact", "display"]):
        candidates = [
            "C:\\Windows\\Fonts\\impact.ttf",
            "C:\\Windows\\Fonts\\ariblk.ttf",
        ]
    elif mono or any(k in fn for k in ["mono", "elite", "typewriter", "consola", "cour"]):
        candidates = [
            "C:\\Windows\\Fonts\\courbd.ttf" if bold else "C:\\Windows\\Fonts\\cour.ttf",
            "C:\\Windows\\Fonts\\consola.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        ]
    elif bold:
        candidates = [
            "C:\\Windows\\Fonts\\segoeuib.ttf",
            "C:\\Windows\\Fonts\\arialbd.ttf",
            "C:\\Windows\\Fonts\\calibrib.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
    else:
        candidates = [
            "C:\\Windows\\Fonts\\segoeui.ttf",
            "C:\\Windows\\Fonts\\arial.ttf",
            "C:\\Windows\\Fonts\\calibri.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]

    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def render_feathered_shadow(
    canvas_size: Tuple[int, int],
    box: Tuple[int, int, int, int],
    radius: int,
    blur_radius: int = 20,
    offset: Tuple[int, int] = (0, 14),
    color: Tuple[int, int, int, int] = (0, 0, 0, 130),
) -> Image.Image:
    """
    Calculates soft feathered drop shadows using a Gaussian blur pass over an RGBA layer.
    """
    shadow = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    x0, y0, x1, y1 = box
    ox, oy = offset
    s_draw.rounded_rectangle(
        [(x0 + ox, y0 + oy), (x1 + ox, y1 + oy)],
        radius=radius,
        fill=color,
    )
    return shadow.filter(ImageFilter.GaussianBlur(radius=blur_radius))


def draw_letterspaced_text(
    draw: ImageDraw.ImageDraw,
    xy: Tuple[int, int],
    text: str,
    font: ImageFont.ImageFont,
    fill: Any,
    spacing: int = 4,
    anchor: str = "mm",
) -> None:
    """
    Renders text with precise character tracking (letter-spacing) and vertical rhythm.
    """
    if not text:
        return

    char_widths = []
    for ch in text:
        try:
            bbox = font.getbbox(ch)
            char_widths.append(max(4, bbox[2] - bbox[0]))
        except Exception:
            char_widths.append(font.getsize(ch)[0] if hasattr(font, "getsize") else 12)

    total_width = sum(char_widths) + max(0, len(text) - 1) * spacing
    cx, cy = xy

    if anchor == "mm":
        curr_x = float(cx) - (total_width / 2.0)
    elif anchor == "lm":
        curr_x = float(cx)
    elif anchor == "rm":
        curr_x = float(cx) - total_width
    else:
        curr_x = float(cx)

    for i, ch in enumerate(text):
        draw.text((int(round(curr_x)), cy), ch, fill=fill, font=font, anchor="lm")
        curr_x += char_widths[i] + spacing


def resolve_focal_point(focal_spec: Any) -> Tuple[float, float]:
    """
    Resolves focal crop point coordinates from string presets ('top', 'center', 'bottom')
    or structured dicts ({'x': float, 'y': float} or {'align': str}).
    """
    if isinstance(focal_spec, str):
        val = focal_spec.strip().lower()
        if val == "top":
            return (0.5, 0.0)
        elif val == "bottom":
            return (0.5, 1.0)
        else:
            return (0.5, 0.5)
    elif isinstance(focal_spec, dict):
        align = focal_spec.get("align") or focal_spec.get("vertical")
        if isinstance(align, str):
            return resolve_focal_point(align)
        fx = float(focal_spec.get("x", 0.5))
        fy = float(focal_spec.get("y", 0.5))
        return (fx, fy)
    return (0.5, 0.5)


def draw_airdrop_overlay(canvas: Image.Image, config: Dict[str, Any]) -> None:
    """
    Draws a procedural mock iOS AirDrop card centered over the canvas.
    """
    card_w, card_h = 740, 520
    x0 = (1080 - card_w) // 2
    y0 = (1350 - card_h) // 2
    x1 = x0 + card_w
    y1 = y0 + card_h
    radius = 36

    # 1. Soft Multi-Pass Feathered Drop Shadow
    card_box = (x0, y0, x1, y1)
    shadow_contact = render_feathered_shadow(
        (1080, 1350), card_box, radius, blur_radius=10, offset=(0, 6), color=(0, 0, 0, 75)
    )
    shadow_ambient = render_feathered_shadow(
        (1080, 1350), card_box, radius + 4, blur_radius=26, offset=(0, 20), color=(0, 0, 0, 115)
    )
    canvas.alpha_composite(shadow_ambient)
    canvas.alpha_composite(shadow_contact)

    # 2. Card Body (Frosted White)
    card_layer = Image.new("RGBA", (1080, 1350), (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(card_layer)
    c_draw.rounded_rectangle(
        [(x0, y0), (x1, y1)],
        radius=radius,
        fill=(250, 250, 252, 245),
        outline=(255, 255, 255, 200),
        width=2,
    )

    # 3. AirDrop Radar Icon
    icon_y = y0 + 64
    # Center dot
    c_draw.ellipse([(534, icon_y - 6), (546, icon_y + 6)], fill=(0, 122, 255, 255))
    # Inner wave
    c_draw.arc([(520, icon_y - 20), (560, icon_y + 20)], start=210, end=330, fill=(0, 122, 255, 255), width=3)
    c_draw.arc([(520, icon_y - 20), (560, icon_y + 20)], start=30, end=150, fill=(0, 122, 255, 255), width=3)
    # Outer wave
    c_draw.arc([(502, icon_y - 38), (578, icon_y + 38)], start=210, end=330, fill=(0, 122, 255, 255), width=3)
    c_draw.arc([(502, icon_y - 38), (578, icon_y + 38)], start=30, end=150, fill=(0, 122, 255, 255), width=3)

    # 4. Text Typography
    font_title = get_font(size=30, bold=True)
    font_device = get_font(size=22, bold=True)
    font_sub = get_font(size=18, bold=False)

    c_draw.text((540, y0 + 130), "AirDrop", fill=(20, 20, 24), font=font_title, anchor="mm")
    dev_name = config.get("device_name", "Lazylens iPhone")
    c_draw.text((540, y0 + 172), dev_name, fill=(28, 28, 32), font=font_device, anchor="mm")
    photo_count = config.get("photo_count", 4)
    c_draw.text((540, y0 + 204), f"would like to share {photo_count} photos", fill=(120, 120, 128), font=font_sub, anchor="mm")

    # 5. Middle Thumbnail Stack Icon
    badge_w, badge_h = 130, 130
    bx0, by0 = 540 - badge_w // 2, y0 + 235
    c_draw.rounded_rectangle(
        [(bx0, by0), (bx0 + badge_w, by0 + badge_h)],
        radius=18,
        fill=(236, 236, 240, 255),
        outline=(218, 218, 222, 255),
        width=1,
    )
    # Draw photo frames icon inside
    c_draw.rectangle([(bx0 + 25, by0 + 35), (bx0 + 85, by0 + 95)], fill=(180, 190, 205, 255), outline=(255, 255, 255), width=2)
    c_draw.rectangle([(bx0 + 45, by0 + 25), (bx0 + 105, by0 + 85)], fill=(140, 160, 190, 255), outline=(255, 255, 255), width=2)
    c_draw.text((540, by0 + badge_h - 14), f"{photo_count} Photos", fill=(100, 100, 110), font=get_font(size=13, bold=True), anchor="mm")

    # 6. Action Buttons Divider
    btn_y = y1 - 85
    c_draw.line([(x0, btn_y), (x1, btn_y)], fill=(216, 216, 220, 255), width=1)
    c_draw.line([(540, btn_y), (540, y1)], fill=(216, 216, 220, 255), width=1)

    font_btn = get_font(size=24, bold=False)
    font_btn_bold = get_font(size=24, bold=True)
    c_draw.text((x0 + card_w // 4, btn_y + 42), "Decline", fill=(0, 122, 255), font=font_btn, anchor="mm")
    c_draw.text((x0 + 3 * card_w // 4, btn_y + 42), "Accept", fill=(0, 122, 255), font=font_btn_bold, anchor="mm")

    canvas.alpha_composite(card_layer)


def draw_location_pill_overlay(canvas: Image.Image, config: Dict[str, Any]) -> None:
    """
    Draws a floating location pill badge with drop shadow.
    """
    pill_w, pill_h = 440, 76
    x0 = (1080 - pill_w) // 2
    y0 = 784
    x1 = x0 + pill_w
    y1 = y0 + pill_h
    radius = 38

    # 1. Soft Multi-Pass Feathered Drop Shadows
    pill_box = (x0, y0, x1, y1)
    shadow_contact = render_feathered_shadow(
        (1080, 1350), pill_box, radius, blur_radius=8, offset=(0, 4), color=(0, 0, 0, 70)
    )
    shadow_ambient = render_feathered_shadow(
        (1080, 1350), pill_box, radius + 2, blur_radius=20, offset=(0, 14), color=(0, 0, 0, 95)
    )
    canvas.alpha_composite(shadow_ambient)
    canvas.alpha_composite(shadow_contact)

    # 2. White Floating Pill
    pill_layer = Image.new("RGBA", (1080, 1350), (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(pill_layer)
    p_draw.rounded_rectangle(
        [(x0, y0), (x1, y1)],
        radius=radius,
        fill=(255, 255, 255, 250),
        outline=(0, 0, 0, 20),
        width=1,
    )

    # 3. Location Pin Icon
    pin_cx = x0 + 46
    pin_cy = y0 + 34
    p_draw.ellipse([(pin_cx - 10, pin_cy - 10), (pin_cx + 10, pin_cy + 10)], fill=(239, 68, 68))
    p_draw.ellipse([(pin_cx - 4, pin_cy - 4), (pin_cx + 4, pin_cy + 4)], fill=(255, 255, 255))
    p_draw.polygon([(pin_cx - 8, pin_cy + 6), (pin_cx + 8, pin_cy + 6), (pin_cx, pin_cy + 18)], fill=(239, 68, 68))

    # 4. Text
    font_loc = get_font(size=20, bold=True)
    font_coords = get_font(size=14, bold=False, mono=True)
    loc_text = config.get("location", "DOLOMITES, ITALY")
    coords_text = config.get("coordinates", "46.4102° N, 11.8440° E")

    p_draw.text((x0 + 74, y0 + 26), loc_text, fill=(24, 24, 27), font=font_loc, anchor="lm")
    p_draw.text((x0 + 74, y0 + 51), coords_text, fill=(113, 113, 122), font=font_coords, anchor="lm")

    canvas.alpha_composite(pill_layer)


def draw_editorial_header_overlay(canvas: Image.Image, config: Dict[str, Any]) -> None:
    """
    Draws a minimalist magazine / scrapbook editorial header across the top.
    """
    header_layer = Image.new("RGBA", (1080, 1350), (0, 0, 0, 0))
    draw = ImageDraw.Draw(header_layer)

    # Top metadata
    font_meta = get_font(size=16, bold=True, mono=True)
    issue_text = config.get("issue", "VOL. 04 / ISSUE NO. 26")
    date_text = config.get("date", "AUTUMN 2026")
    draw.text((60, 48), issue_text, fill=(40, 40, 40, 230), font=font_meta, anchor="lm")
    draw.text((1020, 48), date_text, fill=(90, 90, 90, 230), font=font_meta, anchor="rm")

    # Divider Line
    draw.line([(50, 75), (1030, 75)], fill=(30, 30, 30, 200), width=1)

    # Main Aesthetic Title
    font_title = get_font(size=30, bold=True)
    title_text = config.get("title", "A E S T H E T I C   A R C H I V E")
    draw.text((540, 105), title_text, fill=(20, 20, 24), font=font_title, anchor="mm")

    font_sub = get_font(size=13, bold=False)
    draw.text((540, 132), "CURATED SOCIAL COMPOSITION • 1080 × 1350 PORTRAIT", fill=(110, 110, 115), font=font_sub, anchor="mm")

    canvas.alpha_composite(header_layer)


def draw_torn_edges_overlay(canvas: Image.Image, config: Dict[str, Any]) -> None:
    """
    Renders refined editorial scrapbook paper seams with subtle organic micro-jitter
    and soft 2px dropshadows, replacing crude saw-tooth dividers.
    """
    dividers = config.get("dividers", [455, 895])

    for y_center in dividers:
        # 1. Subtle, organic micro-jitter points across the 1080px canvas
        points = []
        for x in range(0, 1082, 3):
            # Smooth low-amplitude micro-jitter (natural paper deckle fiber variation)
            micro_jitter = (
                math.sin(x * 0.02) * 1.2
                + math.sin(x * 0.08) * 0.7
                + (((x * 7) % 5) - 2) * 0.25
            )
            points.append((x, y_center + micro_jitter))

        # 2. Soft 2px Dropshadow Layer underneath the seam
        shadow_layer = Image.new("RGBA", (1080, 1350), (0, 0, 0, 0))
        s_draw = ImageDraw.Draw(shadow_layer)
        shadow_poly = [(0, y_center + 6)] + [(p[0], p[1] + 2) for p in points] + [(1080, y_center + 6)]
        s_draw.polygon(shadow_poly, fill=(0, 0, 0, 65))
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=2))
        canvas.alpha_composite(shadow_layer)

        # 3. Clean editorial scrapbook seam band (narrow, refined, ~4px)
        seam_layer = Image.new("RGBA", (1080, 1350), (0, 0, 0, 0))
        draw = ImageDraw.Draw(seam_layer)

        top_pts = [(p[0], p[1] - 2) for p in points]
        bot_pts = [(p[0], p[1] + 2) for p in reversed(points)]
        seam_poly = top_pts + bot_pts
        # Refined warm off-white scrapbook paper tone
        draw.polygon(seam_poly, fill=(250, 248, 245, 240))

        # Fine deckle fiber highlight line along the top seam
        for idx in range(len(points) - 1):
            p1 = points[idx]
            p2 = points[idx + 1]
            draw.line([(p1[0], p1[1] - 2), (p2[0], p2[1] - 2)], fill=(255, 255, 255, 180), width=1)
            # Contact baseline shadow line along bottom seam
            draw.line([(p1[0], p1[1] + 2), (p2[0], p2[1] + 2)], fill=(40, 40, 45, 45), width=1)

        canvas.alpha_composite(seam_layer)


def draw_cinematic_subtitles_overlay(canvas: Image.Image, config: Dict[str, Any]) -> None:
    """
    Renders cinema letterbox HUD, vintage movie subtitles, and recording timecode
    with refined letter-spacing and vertical rhythm.
    """
    cinema_layer = Image.new("RGBA", (1080, 1350), (0, 0, 0, 0))
    draw = ImageDraw.Draw(cinema_layer)

    # Top Cinema Header with improved letter-spacing & vertical rhythm
    font_top = get_font(size=15, bold=False, mono=True)
    draw_letterspaced_text(
        draw,
        (540, 75),
        "LAZYLENS PANAVISION 70  •  DIRECTOR'S CUT",
        font_top,
        fill=(160, 160, 168, 230),
        spacing=4,
        anchor="mm",
    )

    # Center Movie Subtitles with feathered cinematic shadow & letter-spacing
    subtitle_text = config.get("subtitle", "— \"in the quiet between city lights, we found our rhythm\" —")
    font_sub = get_font(size=23, bold=False)

    sub_x, sub_y = 540, 675
    # Feathered subtitle drop shadow pass
    sub_shadow_layer = Image.new("RGBA", (1080, 1350), (0, 0, 0, 0))
    sub_sdraw = ImageDraw.Draw(sub_shadow_layer)
    draw_letterspaced_text(
        sub_sdraw,
        (sub_x, sub_y + 2),
        subtitle_text,
        font_sub,
        fill=(0, 0, 0, 230),
        spacing=2,
        anchor="mm",
    )
    sub_shadow_layer = sub_shadow_layer.filter(ImageFilter.GaussianBlur(radius=5))
    canvas.alpha_composite(sub_shadow_layer)

    # Crisp Kodak 35mm yellow subtitle text
    draw_letterspaced_text(
        draw,
        (sub_x, sub_y),
        subtitle_text,
        font_sub,
        fill=(255, 241, 118, 255),
        spacing=2,
        anchor="mm",
    )

    # Bottom Letterbox HUD / Timecode with refined vertical rhythm
    rec_y = 1272
    # Feathered red glow behind recording dot
    draw.ellipse([(61, rec_y - 10), (81, rec_y + 10)], fill=(239, 68, 68, 60))
    draw.ellipse([(65, rec_y - 6), (77, rec_y + 6)], fill=(239, 68, 68, 255))

    font_hud = get_font(size=15, bold=False, mono=True)
    timecode_text = config.get("timecode", "REC ● [01:42:19]  •  35MM KODAK 500T  •  24 FPS")
    draw_letterspaced_text(
        draw,
        (95, rec_y),
        timecode_text,
        font_hud,
        fill=(190, 190, 195, 230),
        spacing=2,
        anchor="lm",
    )
    draw_letterspaced_text(
        draw,
        (1015, rec_y),
        "4:5 RATIO",
        font_hud,
        fill=(135, 135, 140, 230),
        spacing=3,
        anchor="rm",
    )

    canvas.alpha_composite(cinema_layer)


def apply_procedural_overlay(
    canvas: Image.Image,
    overlay_type: str,
    overlay_config: Dict[str, Any],
) -> None:
    """
    Routes procedural overlays to their respective drawing algorithms.
    """
    if overlay_type == "airdrop":
        draw_airdrop_overlay(canvas, overlay_config)
    elif overlay_type == "location_pill":
        draw_location_pill_overlay(canvas, overlay_config)
    elif overlay_type == "editorial_header":
        draw_editorial_header_overlay(canvas, overlay_config)
    elif overlay_type == "torn_edges":
        draw_torn_edges_overlay(canvas, overlay_config)
    elif overlay_type == "cinematic_subtitles":
        draw_cinematic_subtitles_overlay(canvas, overlay_config)



def draw_text_element(canvas: Image.Image, text_el: Dict[str, Any]) -> None:

    """
    Renders custom text elements with typography, colors, positioning, and rotation.
    """
    text = str(text_el.get("text", "") or "")
    if not text:
        return
    font_name = str(text_el.get("font", "segoeui"))
    color_hex = str(text_el.get("color", "#FFFFFF"))
    size = int(text_el.get("size", 24))
    x = float(text_el.get("x", 0.0))
    y = float(text_el.get("y", 0.0))
    rotation = float(text_el.get("rotation", 0.0))

    is_bold = "bold" in font_name.lower()
    is_mono = "mono" in font_name.lower() or "consola" in font_name.lower()
    font = get_font(size=size, font_name=font_name, bold=is_bold, mono=is_mono)
    fill_rgba = hex_to_rgba(color_hex)

    if math.isclose(rotation, 0.0, abs_tol=1e-5):
        draw = ImageDraw.Draw(canvas)
        draw.text((int(round(x)), int(round(y))), text, fill=fill_rgba, font=font)
    else:
        try:
            bbox = font.getbbox(text)
            bw = max(1, bbox[2] - bbox[0])
            bh = max(1, bbox[3] - bbox[1])
            pad = 20
            txt_canvas = Image.new("RGBA", (bw + pad * 2, bh + pad * 2), (0, 0, 0, 0))
            t_draw = ImageDraw.Draw(txt_canvas)
            t_draw.text((pad - bbox[0], pad - bbox[1]), text, fill=fill_rgba, font=font)
            rotated = txt_canvas.rotate(-rotation, resample=Image.Resampling.BICUBIC, expand=True)
            canvas.alpha_composite(rotated, (int(round(x)), int(round(y))))
        except Exception:
            draw = ImageDraw.Draw(canvas)
            draw.text((int(round(x)), int(round(y))), text, fill=fill_rgba, font=font)


def compose_layout(
    layout: Dict[str, Any],
    photo_paths: List[str],
    output_path: str,
    output_format: str = "JPEG",
    quality: int = 95,
    crop_foci: Optional[List[Any]] = None,
    auto_enhance: bool = False,
    transforms: Optional[List[Any]] = None,
    text_elements: Optional[List[Any]] = None,
) -> str:
    """
    Composes photos into the specified layout on a 1080x1350 canvas,
    applying optional procedural overlays (AirDrop, location pill, torn edges, subtitles),
    interactive transformations (pan/zoom/rotation), and custom text layers.

    Args:
        layout: Layout definition matching layout_schema.json
        photo_paths: Ordered list of file paths corresponding to slot_index 0, 1, 2, ...
        output_path: Target destination path for generated image
        output_format: 'JPEG' or 'PNG' or 'WEBP'
        quality: Compression quality (1-100)
        crop_foci: Optional list of focal point dicts {'x': float, 'y': float} or strings ('top', 'center', 'bottom')
        auto_enhance: Whether to apply aesthetic auto-enhancement (+15% color, +10% contrast, +20% sharpness)
        transforms: Optional list of slot transformation dicts (scale, offset_x, offset_y, rotation)
        text_elements: Optional list of TextElement objects/dicts to render on canvas

    Returns:
        Absolute path to the rendered output image.
    """
    validate_layout_structure(layout)

    # Resolve enhancement flag from argument or layout payload
    should_enhance = auto_enhance or layout.get("auto_enhance", False)

    # Sort slots deterministically by slot_index
    slots = sorted(layout["slots"], key=lambda s: s["slot_index"])

    if len(photo_paths) < len(slots):
        raise ValueError(
            f"Layout requires at least {len(slots)} photos. Received {len(photo_paths)}"
        )

    canvas_spec = layout.get("canvas", {})
    canvas_w = canvas_spec.get("width", 1080)
    canvas_h = canvas_spec.get("height", 1350)
    bg_color_hex = canvas_spec.get("background_color", "#121214")
    bg_rgba = hex_to_rgba(bg_color_hex)

    # Initialize master canvas
    canvas = Image.new("RGBA", (canvas_w, canvas_h), bg_rgba)

    # Render base image slots
    for idx, slot in enumerate(slots):
        photo_path = photo_paths[idx]
        if not os.path.exists(photo_path):
            raise FileNotFoundError(f"Photo file at index {idx} not found: {photo_path}")

        target_w = slot["width"]
        target_h = slot["height"]
        target_x = slot["x"]
        target_y = slot["y"]
        radius = slot.get("border_radius", 0)

        # Resolve focal point (supports 'top', 'center', 'bottom' strings & dicts)
        fx, fy = 0.5, 0.5
        if crop_foci and idx < len(crop_foci) and crop_foci[idx] is not None:
            fx, fy = resolve_focal_point(crop_foci[idx])

        # Resolve interactive transformation data (scale, offset_x, offset_y, rotation)
        slot_transform = {}
        if transforms and idx < len(transforms) and transforms[idx] is not None:
            raw_t = transforms[idx]
            if hasattr(raw_t, "model_dump"):
                slot_transform = raw_t.model_dump()
            elif hasattr(raw_t, "dict"):
                slot_transform = raw_t.dict()
            elif isinstance(raw_t, dict):
                slot_transform = raw_t
        elif "scale" in slot or "offset_x" in slot or "offset_y" in slot or "rotation" in slot:
            slot_transform = slot

        scale = float(slot_transform.get("scale", 1.0))
        offset_x = float(slot_transform.get("offset_x", 0.0))
        offset_y = float(slot_transform.get("offset_y", 0.0))
        rotation = float(slot_transform.get("rotation", 0.0))

        is_default_transform = (
            math.isclose(scale, 1.0, rel_tol=1e-5)
            and math.isclose(offset_x, 0.0, abs_tol=1e-5)
            and math.isclose(offset_y, 0.0, abs_tol=1e-5)
            and math.isclose(rotation, 0.0, abs_tol=1e-5)
        )

        # Open and orient source photo
        with Image.open(photo_path) as src_img:
            # Deterministically correct camera EXIF orientation
            oriented = ImageOps.exif_transpose(src_img)
            if oriented.mode != "RGBA":
                oriented = oriented.convert("RGBA")

            # Apply deterministic auto-enhance before cropping and pasting
            if should_enhance:
                oriented = apply_auto_enhance(oriented)

            src_w, src_h = oriented.size

            if is_default_transform:
                # Compute aspect-fill geometry (default fallback logic)
                (res_w, res_h), crop_box = calculate_cover_crop(
                    src_w, src_h, target_w, target_h, focal_x=fx, focal_y=fy
                )
                resized = oriented.resize((res_w, res_h), resample=Image.Resampling.LANCZOS)
                cropped = resized.crop(crop_box)
            else:
                # Interactive transformation: pan, zoom, rotation
                (base_w, base_h), _ = calculate_cover_crop(
                    src_w, src_h, target_w, target_h, focal_x=fx, focal_y=fy
                )
                scaled_w = max(1, int(round(base_w * scale)))
                scaled_h = max(1, int(round(base_h * scale)))
                resized = oriented.resize((scaled_w, scaled_h), resample=Image.Resampling.LANCZOS)

                if not math.isclose(rotation, 0.0, abs_tol=1e-5):
                    resized = resized.rotate(-rotation, resample=Image.Resampling.BICUBIC, expand=True)
                    scaled_w, scaled_h = resized.size

                center_x = (fx * scaled_w) + offset_x
                center_y = (fy * scaled_h) + offset_y
                hw = target_w / 2.0
                hh = target_h / 2.0
                left = int(round(center_x - hw))
                top = int(round(center_y - hh))
                right = left + target_w
                bottom = top + target_h

                slot_canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
                src_left = max(0, left)
                src_top = max(0, top)
                src_right = min(scaled_w, right)
                src_bottom = min(scaled_h, bottom)

                if src_right > src_left and src_bottom > src_top:
                    sub_crop = resized.crop((src_left, src_top, src_right, src_bottom))
                    slot_canvas.paste(sub_crop, (src_left - left, src_top - top))

                cropped = slot_canvas

            # Mask application for rounded corners
            if radius > 0:
                mask = create_rounded_mask(target_w, target_h, radius)
                canvas.paste(cropped, (target_x, target_y), mask)
            else:
                canvas.paste(cropped, (target_x, target_y), cropped if cropped.mode == "RGBA" else None)

    # Apply Procedural Overlays (if configured)
    overlay = layout.get("overlay")
    if overlay and isinstance(overlay, dict):
        overlay_type = overlay.get("type", "")
        overlay_config = overlay.get("config", {})
        apply_procedural_overlay(canvas, overlay_type, overlay_config)

    # Render Text Elements (Custom Typography Layers)
    all_text_elements = []
    if text_elements:
        all_text_elements.extend(text_elements)
    elif layout.get("text_elements"):
        all_text_elements.extend(layout.get("text_elements", []))

    for te in all_text_elements:
        raw_te = te
        if hasattr(raw_te, "model_dump"):
            raw_te = raw_te.model_dump()
        elif hasattr(raw_te, "dict"):
            raw_te = raw_te.dict()
        if isinstance(raw_te, dict):
            draw_text_element(canvas, raw_te)


    # Ensure target directory exists
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    # Save composition
    fmt = output_format.upper()
    if fmt in ["JPG", "JPEG"]:
        # Composite onto solid background RGB before JPEG export
        final_rgb = Image.new("RGB", (canvas_w, canvas_h), bg_rgba[:3])
        final_rgb.paste(canvas, mask=canvas.split()[3])  # Alpha mask
        final_rgb.save(output_path, format="JPEG", quality=quality, subsampling=0)
    elif fmt == "PNG":
        canvas.save(output_path, format="PNG", optimize=True)
    elif fmt == "WEBP":
        canvas.save(output_path, format="WEBP", quality=quality)
    else:
        raise ValueError(f"Unsupported format: {output_format}")

    return os.path.abspath(output_path)


def package_carousel_zip(
    image_paths: List[str],
    captions_data: Dict[str, Any],
    zip_output_path: str,
) -> str:
    """
    Packages rendered carousel slide images and captions JSON into a zip archive.

    Args:
        image_paths: List of file paths to rendered slide images in slide order.
        captions_data: Dictionary containing AI captions and metadata.
        zip_output_path: Target destination path for the .zip archive.

    Returns:
        Absolute path to the created zip file.
    """
    os.makedirs(os.path.dirname(os.path.abspath(zip_output_path)), exist_ok=True)
    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx, img_path in enumerate(image_paths):
            arc_name = f"slide_{idx + 1:02d}_{os.path.basename(img_path)}"
            zf.write(img_path, arcname=arc_name)

        # Include captions.json in the zip archive
        captions_json_str = json.dumps(captions_data, indent=2, ensure_ascii=False)
        zf.writestr("captions.json", captions_json_str)

    return os.path.abspath(zip_output_path)
