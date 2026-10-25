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
