"""
CLI Tool for Lazylens
Command line utility to merge 4 photos deterministically into a 1080x1350 canvas.

Usage:
  python tools/cli.py --layout grid_2x2 --photos p1.jpg p2.jpg p3.jpg p4.jpg --output output/result.jpg
  python tools/cli.py --mock  # Generates 4 mock test images and renders all presets
"""

import argparse
import os
import sys
from dotenv import load_dotenv

# Ensure root directory is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

load_dotenv()

from tools.validator import load_preset_layout
from tools.composer import compose_layout


def main():
    parser = argparse.ArgumentParser(description="Lazylens Deterministic Layout Composer")
    parser.add_argument("--layout", type=str, default="grid_2x2", help="Layout ID preset")
    parser.add_argument(
        "--presets",
        type=str,
        default=os.getenv("PRESETS_FILE", "architecture/preset_layouts.json"),
        help="Path to preset layouts JSON file",
    )
    parser.add_argument(
        "--photos",
        nargs=4,
        type=str,
        help="Four ordered image file paths for slots 0, 1, 2, 3",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="output/composed_canvas.jpg",
        help="Destination path for output image",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=int(os.getenv("OUTPUT_QUALITY", "95")),
        help="Compression quality (1-100)",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Generate 4 mock images and render across all presets for verification",
    )

    args = parser.parse_args()

    if args.mock:
        from tools.test_engine import TestLazylensEngine
        print("Executing mock rendering verification across all presets...")
        TestLazylensEngine.setUpClass()
        out_dir = os.path.abspath("output/mock_renders")
        os.makedirs(out_dir, exist_ok=True)

        presets = [
            "grid_2x2",
            "hero_top_3_sub",
            "hero_left_3_stacked",
            "columns_4",
            "rows_4",
            "airdrop_modal",
            "wanderlust_pill",
            "editorial_scrapbook",
            "torn_strip_3",
            "cinematic_letterbox",
        ]
        for pid in presets:
            layout = load_preset_layout(args.presets, pid)
            dest = os.path.join(out_dir, f"{pid}.jpg")
            compose_layout(layout, TestLazylensEngine.test_images, dest)
            print(f"  [OK] Rendered {pid} -> {dest}")
        TestLazylensEngine.tearDownClass()
        print("Mock rendering completed successfully!")
        return

    if not args.photos:
        print("Error: --photos requires exactly 4 file paths, or use --mock.")
        sys.exit(1)

    layout = load_preset_layout(args.presets, args.layout)
    result = compose_layout(
        layout=layout,
        photo_paths=args.photos,
        output_path=args.output,
        quality=args.quality,
    )
    print(f"Successfully generated 1080x1350 composition at: {result}")


if __name__ == "__main__":
    main()
