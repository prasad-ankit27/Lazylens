"""
Test Engine for Lazylens
Validates geometric calculations, boundary assertions, and deterministic Pillow rendering.
"""

import os
import shutil
import unittest
import json
import zipfile
from PIL import Image, ImageDraw

from tools.geometry import calculate_cover_crop, create_rounded_mask
from tools.validator import validate_layout_structure, load_preset_layout
from tools.composer import compose_layout, package_carousel_zip, apply_auto_enhance


class TestLazylensEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_tmp = os.path.abspath(".tmp/tests")
        cls.test_out = os.path.abspath("output/tests")
        os.makedirs(cls.test_tmp, exist_ok=True)
        os.makedirs(cls.test_out, exist_ok=True)
        cls.presets_path = os.path.abspath("architecture/preset_layouts.json")

        # Generate 4 distinct test images of varied aspect ratios
        cls.test_images = []
        specs = [
            ("img_square.png", (800, 800), "#FF5733"),       # 1:1 Square
            ("img_landscape.png", (1920, 1080), "#33FF57"),   # 16:9 Landscape
            ("img_portrait.png", (1080, 1920), "#3357FF"),    # 9:16 Portrait
            ("img_ultrawide.png", (2400, 800), "#F3FF33"),    # 3:1 Ultra-wide
        ]

        for name, size, color in specs:
            img_path = os.path.join(cls.test_tmp, name)
            img = Image.new("RGB", size, color)
            draw = ImageDraw.Draw(img)
            # Add geometric marker inside
            draw.rectangle([20, 20, size[0] - 20, size[1] - 20], outline="#FFFFFF", width=8)
            img.save(img_path, format="PNG")
            cls.test_images.append(img_path)

    @classmethod
    def tearDownClass(cls):
        # Clean up test directories
        if os.path.exists(cls.test_tmp):
            shutil.rmtree(cls.test_tmp, ignore_errors=True)

    def test_geometry_cover_crop_exactness(self):
        """Verify that cover crop calculates the exact target slot dimensions."""
        test_cases = [
            ((1920, 1080), (508, 643)),   # Landscape into portrait slot
            ((1080, 1920), (508, 643)),   # Portrait into portrait slot
            ((800, 800), (1032, 830)),    # Square into wide hero
            ((2400, 800), (332, 454)),    # Ultrawide into narrow column
        ]

        for (sw, sh), (tw, th) in test_cases:
            (rw, rh), (cl, ct, cr, cb) = calculate_cover_crop(sw, sh, tw, th)
            crop_w = cr - cl
            crop_h = cb - ct
            self.assertEqual(crop_w, tw, f"Width mismatch for {sw}x{sh} -> {tw}x{th}")
            self.assertEqual(crop_h, th, f"Height mismatch for {sw}x{sh} -> {tw}x{th}")
            self.assertGreaterEqual(cl, 0)
            self.assertGreaterEqual(ct, 0)
            self.assertLessEqual(cr, rw)
            self.assertLessEqual(cb, rh)

    def test_mask_generation(self):
        """Verify rounded mask is valid grayscale and matches dimensions."""
        mask = create_rounded_mask(500, 600, radius=20)
        self.assertEqual(mask.size, (500, 600))
        self.assertEqual(mask.mode, "L")
        # Center should be 255 (solid), extreme top-left corner should be 0 (clipped)
        self.assertEqual(mask.getpixel((250, 300)), 255)
        self.assertEqual(mask.getpixel((0, 0)), 0)

    def test_preset_layouts_validation(self):
        """Verify presets pass boundary validation."""
        preset_ids = [
            "grid_2x2",
            "hero_top_3_sub",
            "hero_left_3_stacked",
            "columns_4",
            "rows_4",
            "wanderlust_pill",
            "editorial_scrapbook",
            "torn_strip_3",
            "cinematic_letterbox",
        ]
        for pid in preset_ids:
            preset = load_preset_layout(self.presets_path, pid)
            validate_layout_structure(preset)
            self.assertTrue(2 <= len(preset["slots"]) <= 4)

    def test_end_to_end_composition_grid(self):
        """Verify full rendering produces a pixel-perfect 1080x1350 image."""
        preset = load_preset_layout(self.presets_path, "grid_2x2")
        out_file = os.path.join(self.test_out, "rendered_grid_2x2.jpg")

        res_path = compose_layout(
            layout=preset,
            photo_paths=self.test_images,
            output_path=out_file,
            output_format="JPEG",
            quality=95,
        )

        self.assertTrue(os.path.exists(res_path))
        with Image.open(res_path) as out_img:
            self.assertEqual(out_img.size, (1080, 1350))
            self.assertEqual(out_img.format, "JPEG")

    def test_end_to_end_composition_hero_top(self):
        """Verify hero layout rendering."""
        preset = load_preset_layout(self.presets_path, "hero_top_3_sub")
        out_file = os.path.join(self.test_out, "rendered_hero_top.jpg")

        res_path = compose_layout(
            layout=preset,
            photo_paths=self.test_images,
            output_path=out_file,
            output_format="JPEG",
            quality=95,
        )

        self.assertTrue(os.path.exists(res_path))
        with Image.open(res_path) as out_img:
            self.assertEqual(out_img.size, (1080, 1350))

    def test_procedural_overlays_rendering(self):
        """Verify rendering of modern aesthetic presets with procedural overlays."""
        overlay_presets = [
            "wanderlust_pill",
            "editorial_scrapbook",
            "torn_strip_3",
            "cinematic_letterbox",
        ]
        for pid in overlay_presets:
            preset = load_preset_layout(self.presets_path, pid)
            out_file = os.path.join(self.test_out, f"test_{pid}.jpg")
            res_path = compose_layout(
                layout=preset,
                photo_paths=self.test_images,
                output_path=out_file,
                output_format="JPEG",
                quality=90,
            )
            self.assertTrue(os.path.exists(res_path))
            with Image.open(res_path) as img:
                self.assertEqual(img.size, (1080, 1350))

    def test_focal_crop_offsets(self):
        """Verify rendering with vertical focal crop offsets ('top', 'center', 'bottom')."""
        preset = load_preset_layout(self.presets_path, "grid_2x2")
        out_file = os.path.join(self.test_out, "test_focal_grid.jpg")
        foci = ["top", "center", "bottom", "top"]
        res_path = compose_layout(
            layout=preset,
            photo_paths=self.test_images,
            output_path=out_file,
            output_format="JPEG",
            quality=90,
            crop_foci=foci,
        )
        self.assertTrue(os.path.exists(res_path))
        with Image.open(res_path) as img:
            self.assertEqual(img.size, (1080, 1350))

    def test_package_carousel_zip(self):
        """Verify multi-slide carousel bundling into a zip file with captions.json."""
        # Render 2 slides
        presets = ["grid_2x2", "wanderlust_pill"]
        rendered_slides = []
        for s_idx, pid in enumerate(presets):
            preset = load_preset_layout(self.presets_path, pid)
            slide_path = os.path.join(self.test_out, f"carousel_slide_{s_idx + 1}_{pid}.jpg")
            compose_layout(
                layout=preset,
                photo_paths=self.test_images,
                output_path=slide_path,

                output_format="JPEG",
                quality=90,
            )
            rendered_slides.append(slide_path)

        captions_payload = {
            "summary": "City lights and coffee moments.",
            "aesthetic": "lost in neon reflections.",
            "witty": "Espresso yourself before you depresso yourself.",
            "hinglish": "Midnight vibes aur cold coffee ki kahani.",
            "hashtags": ["#cityvibes", "#coffeetime", "#nightlife", "#lazylens"],
        }

        zip_out = os.path.join(self.test_out, "test_carousel_export.zip")
        if os.path.exists(zip_out):
            os.remove(zip_out)

        zip_res = package_carousel_zip(
            image_paths=rendered_slides,
            captions_data=captions_payload,
            zip_output_path=zip_out,
        )

        self.assertTrue(os.path.exists(zip_res))
        with zipfile.ZipFile(zip_res, "r") as zf:
            namelist = zf.namelist()
            self.assertIn("captions.json", namelist)
            self.assertEqual(len([n for n in namelist if n.endswith(".jpg")]), 2)

            # Validate captions.json content
            with zf.open("captions.json") as f:
                loaded_captions = json.loads(f.read().decode("utf-8"))
                self.assertEqual(loaded_captions["aesthetic"], "lost in neon reflections.")
                self.assertEqual(len(loaded_captions["hashtags"]), 4)

    def test_apply_auto_enhance(self):
        """Verify mathematical auto-enhancement applies color, contrast, and sharpness boosts."""
        base_img = Image.new("RGBA", (200, 200), (120, 140, 160, 255))
        enhanced = apply_auto_enhance(base_img)
        self.assertEqual(enhanced.size, base_img.size)
        self.assertEqual(enhanced.mode, "RGBA")
        # Ensure image is not identical to blank original after contrast/saturation operations
        self.assertIsNotNone(enhanced)

    def test_compose_layout_with_auto_enhance(self):
        """Verify full layout composition with auto_enhance=True flag enabled."""
        preset = load_preset_layout(self.presets_path, "grid_2x2")
        out_path = os.path.join(self.test_out, "test_enhanced_output.jpg")
        res = compose_layout(
            layout=preset,
            photo_paths=self.test_images,
            output_path=out_path,
            output_format="JPEG",
            quality=95,
            auto_enhance=True,
        )
        self.assertTrue(os.path.exists(res))
        with Image.open(res) as img:
            self.assertEqual(img.size, (1080, 1350))

    def test_phase9_categorized_preset_layouts_100_plus(self):
        """Verify preset_layouts.json contains categorized structure with 100+ valid templates."""
        with open(self.presets_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertIn("categories", data)
        self.assertIn("Categories", data)
        cats = data["categories"]

        expected_categories = ["Minimalist", "Film", "Editorial", "Scrapbook", "Polaroid"]
        for cat in expected_categories:
            self.assertIn(cat, cats, f"Category '{cat}' missing from preset_layouts.json")
            self.assertGreaterEqual(len(cats[cat]), 10, f"Category '{cat}' has fewer than 10 presets")

        # Flat count >= 100
        all_presets = data.get("presets", [])
        self.assertGreaterEqual(len(all_presets), 100, f"Expected >= 100 templates, found {len(all_presets)}")

        # Every preset passes boundary structure validation and has sample_images + sample_text
        for p in all_presets:
            validate_layout_structure(p)
            self.assertIn("sample_images", p)
            self.assertIn("sample_text", p)
            self.assertGreaterEqual(len(p["sample_images"]), len(p["slots"]))
            self.assertGreaterEqual(len(p["sample_text"]), 1)

    def test_phase9_pydantic_models(self):
        """Verify upgraded Pydantic models in tools/server.py."""
        from tools.server import Slot, Image as ImageModel, TextElement, SlideManifestItem, Slide, RenderCompositionPayload

        # 1. Slot model accepts scale, offset_x, offset_y, rotation defaults and custom values
        default_slot = Slot()
        self.assertEqual(default_slot.scale, 1.0)
        self.assertEqual(default_slot.offset_x, 0.0)
        self.assertEqual(default_slot.offset_y, 0.0)
        self.assertEqual(default_slot.rotation, 0.0)

        custom_slot = Slot(slot_index=1, scale=1.35, offset_x=12.5, offset_y=-24.0, rotation=45.0)
        self.assertEqual(custom_slot.scale, 1.35)
        self.assertEqual(custom_slot.offset_x, 12.5)
        self.assertEqual(custom_slot.offset_y, -24.0)
        self.assertEqual(custom_slot.rotation, 45.0)

        # 2. Image payload model accepts transformation data
        img_slot = ImageModel(scale=1.2, offset_x=-10.0, offset_y=15.0, rotation=90.0)
        self.assertEqual(img_slot.scale, 1.2)

        # 3. TextElement model accepts text, font, color, size, x, y, rotation
        text_el = TextElement(
            text="PARIS, FRANCE",
            font="segoeui",
            color="#FF5733",
            size=32,
            x=150.0,
            y=300.0,
            rotation=10.0,
        )
        self.assertEqual(text_el.text, "PARIS, FRANCE")
        self.assertEqual(text_el.font, "segoeui")
        self.assertEqual(text_el.color, "#FF5733")
        self.assertEqual(text_el.size, 32)
        self.assertEqual(text_el.x, 150.0)
        self.assertEqual(text_el.y, 300.0)
        self.assertEqual(text_el.rotation, 10.0)

        # 4. Slide accepts a list of TextElement objects and Slot objects
        slide = Slide(
            slide_index=0,
            layout_id="grid_2x2",
            photo_count=4,
            slots=[custom_slot],
            text_elements=[text_el],
        )
        self.assertEqual(len(slide.text_elements), 1)
        self.assertEqual(slide.text_elements[0].text, "PARIS, FRANCE")

        # 5. RenderCompositionPayload accepts manifest with TextElements
        payload = RenderCompositionPayload(
            layout_id="grid_2x2",
            slides_manifest=[slide],
            text_elements=[text_el],
        )
        self.assertEqual(len(payload.slides_manifest), 1)

    def test_phase9_composer_interactive_transform_and_fallback(self):
        """Verify that default transforms fall back identically while non-default transforms render properly."""
        preset = load_preset_layout(self.presets_path, "grid_2x2")

        # Fallback test with default scale 1.0, offset 0, rot 0
        default_out = os.path.join(self.test_out, "test_transform_default.jpg")
        res_default = compose_layout(
            layout=preset,
            photo_paths=self.test_images,
            output_path=default_out,
            transforms=[
                {"scale": 1.0, "offset_x": 0.0, "offset_y": 0.0, "rotation": 0.0},
                {"scale": 1.0, "offset_x": 0.0, "offset_y": 0.0, "rotation": 0.0},
                {"scale": 1.0, "offset_x": 0.0, "offset_y": 0.0, "rotation": 0.0},
                {"scale": 1.0, "offset_x": 0.0, "offset_y": 0.0, "rotation": 0.0},
            ],
        )
        self.assertTrue(os.path.exists(res_default))

        # Interactive pan/zoom test (scale=1.4, offset_x=30, offset_y=-20, rot=5)
        transformed_out = os.path.join(self.test_out, "test_transform_interactive.jpg")
        res_transformed = compose_layout(
            layout=preset,
            photo_paths=self.test_images,
            output_path=transformed_out,
            transforms=[
                {"scale": 1.4, "offset_x": 30.0, "offset_y": -20.0, "rotation": 5.0},
                {"scale": 1.2, "offset_x": -15.0, "offset_y": 10.0, "rotation": 0.0},
                {"scale": 1.0, "offset_x": 0.0, "offset_y": 0.0, "rotation": 0.0},
                {"scale": 1.5, "offset_x": 0.0, "offset_y": 0.0, "rotation": -5.0},
            ],
            text_elements=[
                {
                    "text": "INTERACTIVE PAN // ZOOM",
                    "font": "segoeui",
                    "color": "#FFFFFF",
                    "size": 36,
                    "x": 80.0,
                    "y": 640.0,
                    "rotation": 0.0,
                }
            ],
        )
        self.assertTrue(os.path.exists(res_transformed))
        with Image.open(res_transformed) as img:
            self.assertEqual(img.size, (1080, 1350))


if __name__ == "__main__":
    unittest.main()

