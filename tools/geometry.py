"""
Geometry Module for Lazylens
Provides deterministic mathematical calculations for aspect-fill 'cover' cropping,
scaling factors, clamping, and rounded-corner alpha mask generation.
Pure geometric math; no AI models used.
"""

from typing import Tuple, Dict, Any
from PIL import Image, ImageDraw


def calculate_cover_crop(
    source_width: int,
    source_height: int,
    target_width: int,
    target_height: int,
    focal_x: float = 0.5,
    focal_y: float = 0.5,
) -> Tuple[Tuple[int, int], Tuple[int, int, int, int]]:
    """
    Computes deterministic scale dimensions and crop box to fill target dimensions
    without distorting aspect ratio (equivalent to CSS 'object-fit: cover').

    Args:
        source_width: Width of source image in pixels.
        source_height: Height of source image in pixels.
        target_width: Desired slot width in pixels.
        target_height: Desired slot height in pixels.
        focal_x: Normalized horizontal focal point [0.0, 1.0], default 0.5 (center).
        focal_y: Normalized vertical focal point [0.0, 1.0], default 0.5 (center).

    Returns:
        ((resized_width, resized_height), (crop_left, crop_top, crop_right, crop_bottom))
    """
    if source_width <= 0 or source_height <= 0:
        raise ValueError(f"Invalid source dimensions: {source_width}x{source_height}")
    if target_width <= 0 or target_height <= 0:
        raise ValueError(f"Invalid target dimensions: {target_width}x{target_height}")

    # Resolve focal offsets (supports string identifiers like 'top', 'center', 'bottom')
    if isinstance(focal_x, str):
        fx_str = focal_x.strip().lower()
        fx_val = 0.0 if fx_str == "left" else (1.0 if fx_str == "right" else 0.5)
    else:
        fx_val = float(focal_x)

    if isinstance(focal_y, str):
        fy_str = focal_y.strip().lower()
        fy_val = 0.0 if fy_str == "top" else (1.0 if fy_str == "bottom" else 0.5)
    else:
        fy_val = float(focal_y)

    # Clamp focal points between 0.0 and 1.0
    fx = max(0.0, min(1.0, fx_val))
    fy = max(0.0, min(1.0, fy_val))

    # Compute aspect-preserving scale factor
    scale_w = target_width / source_width
    scale_h = target_height / source_height
    scale = max(scale_w, scale_h)

    resized_width = max(target_width, int(round(source_width * scale)))
    resized_height = max(target_height, int(round(source_height * scale)))

    # Compute crop offsets around focal center
    center_x = resized_width * fx
    center_y = resized_height * fy

    crop_left = int(round(center_x - (target_width / 2.0)))
    crop_top = int(round(center_y - (target_height / 2.0)))

    # Strictly clamp within resized bounds
    crop_left = max(0, min(crop_left, resized_width - target_width))
    crop_top = max(0, min(crop_top, resized_height - target_height))
    crop_right = crop_left + target_width
    crop_bottom = crop_top + target_height

    return (resized_width, resized_height), (crop_left, crop_top, crop_right, crop_bottom)


def create_rounded_mask(width: int, height: int, radius: int) -> Image.Image:
    """
    Generates an 8-bit grayscale (mode 'L') antialiased rounded rectangle mask.

    Args:
        width: Mask width in pixels.
        height: Mask height in pixels.
        radius: Corner radius in pixels.

    Returns:
        PIL.Image in mode 'L' (255 inside rounded rect, 0 outside).
    """
    if radius <= 0:
        return Image.new("L", (width, height), 255)

    # Render at 2x supersampling for high-quality antialiased corner curves
    supersample = 2
    sw, sh, sr = width * supersample, height * supersample, radius * supersample

    mask = Image.new("L", (sw, sh), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (sw - 1, sh - 1)], radius=sr, fill=255)

    return mask.resize((width, height), resample=Image.Resampling.LANCZOS)
