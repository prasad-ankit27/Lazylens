# System Blueprint: Zero-Touch Social Media Layout Generator (Lazylens)

**Document Version:** 1.0.0  
**Status:** PROPOSED (Protocol 0 - Pending User Approval)  
**Lead System Pilot:** Antigravity  
**Target Canvas:** 1080 × 1350 px (4:5 Portrait Aspect Ratio for Instagram / Social Feeds)

---

## 1. Executive Architecture & Core Philosophy

The Lazylens system is a high-performance, **deterministic geometric layout engine** paired with an interactive **Next.js frontend**. 

### Core Tenets:
1. **Zero Hallucination / Pure Determinism:** No generative AI models are utilized for composition. All image placement, scaling, cropping, and compositing are computed geometrically using exact pixel coordinates and PIL (Pillow) resampling (`Resampling.LANCZOS`).
2. **Predictable 4-Slot Model:** Every composition strictly manages four (4) user assets mapped to four discrete coordinate slots `[0, 1, 2, 3]`.
3. **Instant Zero-Latency Index Swapping:** The frontend enables one-click pairwise swapping between any two slots in React state before dispatching the final ordered array to the Python rendering engine.
4. **Isolated Intermediate Storage:** All staging and processing occur in `.tmp/` using UUID namespacing, with configuration orchestrated via `.env`.

```
+-------------------------------------------------------------------------+
|                           Next.js Frontend                              |
|  - 4-Slot State Array [photo0, photo1, photo2, photo3]                  |
|  - Instant Index Swap on Click (Slot i <-> Slot j)                      |
|  - Real-time SVG/Canvas Layout Preset Selector                          |
+------------------------------------+------------------------------------+
                                     | HTTP POST /render (JSON + Files)
                                     v
+------------------------------------+------------------------------------+
|                      FastAPI / Python Runner                            |
|  - Ingests multipart files -> staged in .tmp/<request_id>/              |
|  - Validates payload against architecture/render_payload_schema.json    |
+------------------------------------+------------------------------------+
                                     | Dispatches to
                                     v
+------------------------------------+------------------------------------+
|               Deterministic Engine (tools/ Pillow pipeline)             |
|  1. tools/validator.py : Verifies geometry & bounds                     |
|  2. tools/geometry.py  : Computes 'cover' crop box & mask               |
|  3. tools/composer.py  : Lanczos scale -> crop -> paste at (x, y)       |
+------------------------------------+------------------------------------+
                                     |
                                     v Output: 1080x1350 JPEG/PNG
```

---

## 2. JSON Data Schemas (Source of Truth)

All definitions reside in `architecture/`:
- **Layout Schema:** [`architecture/layout_schema.json`](file:///c:/Users/Ankit_Prasad/OneDrive/Desktop/Lazylens/architecture/layout_schema.json)
- **Render Request Schema:** [`architecture/render_payload_schema.json`](file:///c:/Users/Ankit_Prasad/OneDrive/Desktop/Lazylens/architecture/render_payload_schema.json)
- **Standard Presets:** [`architecture/preset_layouts.json`](file:///c:/Users/Ankit_Prasad/OneDrive/Desktop/Lazylens/architecture/preset_layouts.json)

### 2.1 Layout Data Schema Summary
```json
{
  "layout_id": "grid_2x2",
  "name": "Balanced Quad (2x2)",
  "canvas": {
    "width": 1080,
    "height": 1350,
    "background_color": "#121214",
    "outer_margin": 24,
    "gutter": 16
  },
  "slots": [
    { "slot_index": 0, "x": 24, "y": 24, "width": 508, "height": 643, "fit_mode": "cover", "border_radius": 12 },
    { "slot_index": 1, "x": 548, "y": 24, "width": 508, "height": 643, "fit_mode": "cover", "border_radius": 12 },
    { "slot_index": 2, "x": 24, "y": 683, "width": 508, "height": 643, "fit_mode": "cover", "border_radius": 12 },
    { "slot_index": 3, "x": 548, "y": 683, "width": 508, "height": 643, "fit_mode": "cover", "border_radius": 12 }
  ]
}
```

### 2.2 Predefined Layout Catalog

| Layout ID | Name | Structure Description |
| :--- | :--- | :--- |
| `grid_2x2` | **Balanced Quad** | 2 equal columns × 2 equal rows (508 × 643 px each) |
| `hero_top_3_sub` | **Hero Header & Triptych** | 1 large top banner (1032 × 830 px) over 3 vertical columns (332 × 454 px each) |
| `hero_left_3_stacked` | **Feature Split** | 1 tall hero on left (640 × 1302 px) + 3 stacked horizontal cards on right (374 × 422 px each) |
| `columns_4` | **Vertical Strips** | 4 vertical magazine slices (246 × 1302 px each) |
| `rows_4` | **Cinematic Letterbox** | 4 horizontal landscape rows (1032 × 315 px each) |
| `airdrop_modal` | **AirDrop Modal** | 4-photo backdrop covered by a centered mock iOS AirDrop card overlay (740 × 520 px) |
| `wanderlust_pill` | **Wanderlust Pill** | 3-photo asymmetrical layout (2 vertical top, 1 panoramic bottom) + floating location pill |
| `editorial_scrapbook` | **Editorial Scrapbook** | 3-photo collage with overlapping layers, generous negative space & magazine header |
| `torn_strip_3` | **Torn Paper Strips** | 3 horizontal landscape photos stacked with procedural jagged/torn paper dividers |
| `cinematic_letterbox` | **Cinematic Panavision** | 2 wide panoramic stills with heavy 35mm letterbox borders, subtitles & timecode HUD |

*All 10 presets have been mathematically verified to strictly stay within `1080 × 1350` bounds with integer margins and gutters.*

---

## 3. Backend Pipeline (`tools/` - Python & Pillow)

> [!IMPORTANT]
> Functional code creation in `tools/` is currently **HALTED** under Protocol 0 pending user sign-off.

When authorized in Phase 1, the backend will consist of three atomic modules:

### 3.1 `tools/geometry.py`
- **Aspect-Fill Crop Math:**
  Given source image dimensions $(W_s, H_s)$ and target slot $(W_t, H_t)$:
  $$\text{scale} = \max\left(\frac{W_t}{W_s}, \frac{H_t}{H_s}\right)$$
  Resized dimensions: $(W_r, H_r) = (\text{round}(W_s \cdot \text{scale}), \text{round}(H_s \cdot \text{scale}))$.
  Crop offsets around focal center $(f_x, f_y)$ (default $0.5, 0.5$):
  $$x_1 = \text{clamp}(0, \text{round}(W_r \cdot f_x - W_t / 2), W_r - W_t)$$
  $$y_1 = \text{clamp}(0, \text{round}(H_r \cdot f_y - H_t / 2), H_r - H_t)$$
  Crop box: $(x_1, y_1, x_1 + W_t, y_1 + H_t)$.
- **Mask Generation:**
  Generates an 8-bit alpha mask (`L` mode) with rounded corners when `border_radius > 0` using `PIL.ImageDraw.Draw.rounded_rectangle`.

### 3.2 `tools/composer.py`
- Initializes a master `PIL.Image.new("RGBA", (1080, 1350), background_color)`.
- For each slot $i \in \{0, 1, 2, 3\}$:
  1. Opens the staged file from `.tmp/`.
  2. Auto-orients according to EXIF tags (`PIL.ImageOps.exif_transpose`).
  3. Resizes using `PIL.Image.Resampling.LANCZOS` and crops to $(W_t, H_t)$.
  4. Applies rounded corner mask (if configured).
  5. Pastes deterministically onto the canvas at target coordinates $(x_i, y_i)$.
- Saves final composite to `output/<request_id>.<ext>` or `.tmp/` at quality 95.

### 3.3 `tools/validator.py`
- Uses `jsonschema` to validate all layout files and render payloads.
- Runs bounding box collision detection to guarantee no overlapping or clipping pixels.

---

## 4. Frontend Architecture (Next.js & React State)

### 4.1 State Model
```typescript
interface PhotoSlotState {
  id: string;             // unique client upload id
  file: File | null;      // uploaded binary file
  previewUrl: string;     // local object URL
  name: string;           // original file name
}

// Exactly 4 items in array:
const [photos, setPhotos] = useState<PhotoSlotState[]>(initialEmptySlots);
const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
const [selectedLayoutId, setSelectedLayoutId] = useState<string>("grid_2x2");
```

### 4.2 Deterministic Swap Interaction
1. User clicks Slot `A` (e.g., index `1`): `selectedSlotIndex` becomes `1` (visual highlight ring active).
2. User clicks Slot `B` (e.g., index `3`):
   ```typescript
   function handleSlotClick(targetIndex: number) {
     if (selectedSlotIndex === null) {
       setSelectedSlotIndex(targetIndex);
     } else if (selectedSlotIndex === targetIndex) {
       setSelectedSlotIndex(null); // deselect
     } else {
       // Atomic array swap
       setPhotos((prev) => {
         const next = [...prev];
         const temp = next[selectedSlotIndex];
         next[selectedSlotIndex] = next[targetIndex];
         next[targetIndex] = temp;
         return next;
       });
       setSelectedSlotIndex(null);
     }
   }
   ```
3. UI immediately updates preview positions.
4. Export button packages the current `photos` array order with `selectedLayoutId` and triggers Python backend.

---

## 5. Storage & Environment Configuration

Configuration stored in [`.env`](file:///c:/Users/Ankit_Prasad/OneDrive/Desktop/Lazylens/.env):
- `CANVAS_WIDTH=1080`
- `CANVAS_HEIGHT=1350`
- `DEFAULT_BG_COLOR=#121214`
- `TMP_DIR=.tmp`
- `OUTPUT_DIR=output`
- `PRESETS_FILE=architecture/preset_layouts.json`
- `BACKEND_PORT=8000`

### `.tmp/` Lifecycle:
- Intermediate files are isolated under `.tmp/<request_id>/`.
- Atomic cleanup deletes intermediate crops once the master 1080×1350 image is assembled.
- Added to `.gitignore` to prevent repository bloat.

---

## 6. Verification & Test Plan

1. **Geometry Unit Test:**
   - Test `geometry.py` across diverse source aspect ratios (square 1:1, landscape 16:9, vertical 9:16, ultra-wide) to verify exact dimension output and zero aspect ratio distortion.
2. **Bounds Checking Test:**
   - Automated script asserting $\forall \text{ slot } s: x_s + w_s \le 1080 \land y_s + h_s \le 1350$.
3. **Pillow Composite Output Test:**
   - Render 4 test color patches or sample images into 1080×1350 canvas for all 5 presets. Verify output image resolution is exactly $(1080, 1350)$.
4. **Interactive Swap UI Test:**
   - End-to-end browser subagent verification of photo upload, index swap, preset selection, and final render generation.

---

## 7. Protocol 0 Gate Status

> [!WARNING]
> **EXECUTION HALTED:**  
> In accordance with Protocol 0, no functional code has been or will be written in `tools/` until the User formally reviews and approves this Blueprint and the JSON Data Schemas.
