import PRESET_JSON from "./preset_layouts.json";

export interface LayoutSlot {
  slot_index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fit_mode: "cover" | "contain" | "fill";
  border_radius: number;
  scale?: number;
  offset_x?: number;
  offset_y?: number;
  rotation?: number;
}

export interface CanvasSpec {
  width: number;
  height: number;
  background_color: string;
  outer_margin: number;
  gutter: number;
}

export interface LayoutOverlay {
  type: "airdrop" | "location_pill" | "editorial_header" | "torn_edges" | "cinematic_subtitles" | string;
  config?: Record<string, any>;
}

export interface SlotTransform {
  scale: number;
  offset_x: number;
  offset_y: number;
  rotation: number;
  flip_h?: boolean;
  flip_v?: boolean;
  brightness?: number; // -100 to 100
  contrast?: number;   // -100 to 100
  saturation?: number; // -100 to 100
  warmth?: number;     // -100 to 100
  filter?: "none" | "natural" | "vivid" | "film" | "bw" | "warm";
  border_width?: number;
  border_color?: string;
  border_style?: "none" | "solid" | "dashed";
  shadow?: boolean;
  locked?: boolean;
  hidden?: boolean;
}

export interface TextElement {
  id: string;
  text: string;
  font: string;
  fontStyle?: "normal" | "italic";
  color: string;
  size: number;
  weight?: number;
  align?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  opacity?: number;
  x: number;
  y: number;
  rotation: number;
  shadow?: boolean;
  locked?: boolean;
  hidden?: boolean;
}

export interface StickerElement {
  id: string;
  type: "heart" | "note" | "tape" | "flower" | "star" | "doodle";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  content?: string;
  locked?: boolean;
  hidden?: boolean;
}

export interface LayoutPreset {
  layout_id: string;
  name: string;
  category?: string;
  canvas: CanvasSpec;
  slots: LayoutSlot[];
  overlay?: LayoutOverlay;
  sample_images?: string[];
  sample_text?: string[];
}

export const CATEGORIES_DATA: Record<string, LayoutPreset[]> = (PRESET_JSON.categories || PRESET_JSON.Categories) as any;
export const PRESET_LAYOUTS: LayoutPreset[] = PRESET_JSON.presets as any;

export interface FontItem {
  name: string;
  family: string;
  fallback: string;
}

export interface FontCategory {
  category: string;
  fonts: FontItem[];
}

export const FONT_CATEGORIES: FontCategory[] = [
  {
    category: "Modern Sans Serif",
    fonts: [
      { name: "Inter", family: "Inter", fallback: "sans-serif" },
      { name: "Manrope", family: "Manrope", fallback: "sans-serif" },
      { name: "Plus Jakarta Sans", family: "Plus Jakarta Sans", fallback: "sans-serif" },
    ],
  },
  {
    category: "Editorial Serif",
    fonts: [
      { name: "Playfair Display", family: "Playfair Display", fallback: "Georgia, serif" },
      { name: "Cormorant Garamond", family: "Cormorant Garamond", fallback: "Garamond, serif" },
      { name: "DM Serif Display", family: "DM Serif Display", fallback: "Georgia, serif" },
    ],
  },
  {
    category: "Handwritten",
    fonts: [
      { name: "Caveat", family: "Caveat", fallback: "cursive" },
      { name: "Patrick Hand", family: "Patrick Hand", fallback: "cursive" },
      { name: "Kalam", family: "Kalam", fallback: "cursive" },
    ],
  },
  {
    category: "Calligraphy",
    fonts: [
      { name: "Great Vibes", family: "Great Vibes", fallback: "'Brush Script MT', cursive" },
      { name: "Allura", family: "Allura", fallback: "'Brush Script MT', cursive" },
      { name: "Sacramento", family: "Sacramento", fallback: "'Brush Script MT', cursive" },
    ],
  },
  {
    category: "Bold Display",
    fonts: [
      { name: "Bebas Neue", family: "Bebas Neue", fallback: "Impact, sans-serif" },
      { name: "Anton", family: "Anton", fallback: "Impact, sans-serif" },
      { name: "Oswald", family: "Oswald", fallback: "'Arial Narrow', sans-serif" },
    ],
  },
  {
    category: "Creative / Retro",
    fonts: [
      { name: "Abril Fatface", family: "Abril Fatface", fallback: "Georgia, serif" },
      { name: "Permanent Marker", family: "Permanent Marker", fallback: "Impact, cursive" },
      { name: "Special Elite", family: "Special Elite", fallback: "'Courier New', monospace" },
    ],
  },
];

export function getFontCssStack(fontName?: string): string {
  if (!fontName) return '"Plus Jakarta Sans", sans-serif';
  for (const group of FONT_CATEGORIES) {
    const found = group.fonts.find(
      (f) => f.name.toLowerCase() === fontName.toLowerCase() || f.family.toLowerCase() === fontName.toLowerCase()
    );
    if (found) {
      return `"${found.family}", ${found.fallback}`;
    }
  }
  // Generic fallback if not in defined catalog
  return `"${fontName}", sans-serif`;
}
