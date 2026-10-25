import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const OLLAMA_URL = process.env.OLLAMA_API_URL || "http://localhost:11434";
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || "llava";
const PYTHON_BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface LayoutSlot {
  slot_index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fit_mode: string;
  border_radius: number;
}

interface LayoutPreset {
  layout_id: string;
  name: string;
  category?: string;
  slots: LayoutSlot[];
  canvas: {
    width: number;
    height: number;
    background_color: string;
    outer_margin: number;
    gutter: number;
  };
  sample_images?: string[];
  sample_text?: string[];
}

function loadPresets(): LayoutPreset[] {
  const p1 = path.join(process.cwd(), "app", "preset_layouts.json");
  const p2 = path.join(process.cwd(), "preset_layouts.json");
  const targetPath = fs.existsSync(p1) ? p1 : fs.existsSync(p2) ? p2 : null;

  if (!targetPath) return [];
  try {
    const raw = fs.readFileSync(targetPath, "utf-8");
    const data = JSON.parse(raw);
    return data.presets || [];
  } catch (err) {
    console.error("[Suggest Templates] Error loading preset_layouts.json:", err);
    return [];
  }
}

function evaluateAestheticScores(sceneText: string): Record<string, number> {
  const text = (sceneText || "").toLowerCase();
  const scores: Record<string, number> = {
    Film: 1.0,
    Minimalist: 1.0,
    Editorial: 1.0,
    Scrapbook: 1.0,
    Polaroid: 1.0,
  };

  // Film / Vintage cues
  if (/(warm|amber|red|candle|night|neon|shadow|glow|analog|vintage|nostalg)/.test(text)) {
    scores["Film"] += 3.8;
    scores["Polaroid"] += 2.6;
  }

  // Minimalist / Clean cues
  if (/(clean|minimal|sleek|modern|quiet|simple|architecture|monochrome|serene|soft)/.test(text)) {
    scores["Minimalist"] += 3.8;
    scores["Editorial"] += 2.2;
  }

  // Editorial / Fashion cues
  if (/(fashion|portrait|chic|dress|outfit|model|stylish|magazine|contrast|luxury|suit)/.test(text)) {
    scores["Editorial"] += 4.0;
    scores["Minimalist"] += 2.2;
  }

  // Scrapbook / Travel / Lifestyle cues
  if (/(friends|food|dining|laugh|table|cafe|travel|vacation|gathering|fun|plates)/.test(text)) {
    scores["Scrapbook"] += 3.6;
    scores["Polaroid"] += 2.8;
  }

  // Polaroid / Casual cues
  if (/(casual|intimate|moment|snapshot|smile|drink|street)/.test(text)) {
    scores["Polaroid"] += 3.2;
    scores["Film"] += 2.2;
  }

  return scores;
}

function generateMatchReason(preset: LayoutPreset, sceneSummary: string, photoCount: number): string {
  const cat = preset.category || "Minimalist";
  const slotCount = preset.slots?.length || photoCount;
  const summaryLower = (sceneSummary || "").toLowerCase();

  if (cat === "Film" || cat === "Polaroid") {
    if (summaryLower.includes("warm") || summaryLower.includes("night") || summaryLower.includes("ambient")) {
      return `Warm vintage aesthetic that complements the rich ambient tones across all ${slotCount} frames.`;
    }
    return `Retro analog framing designed for candid storytelling and nostalgic moments.`;
  }

  if (cat === "Editorial") {
    if (summaryLower.includes("portrait") || summaryLower.includes("fashion") || summaryLower.includes("stylish")) {
      return `Magazine-inspired editorial layout with refined hierarchy for primary subject portraits.`;
    }
    return `High-contrast editorial grid with structured negative space and strong visual presence.`;
  }

  if (cat === "Scrapbook") {
    if (summaryLower.includes("food") || summaryLower.includes("friends") || summaryLower.includes("dining")) {
      return `Layered lifestyle collage ideal for restaurant memories, dishes, and shared moments.`;
    }
    return `Playful composition with organic angles that bring dynamism to personal photo collections.`;
  }

  // Minimalist default
  if (slotCount === photoCount) {
    return `Clean, balanced ${slotCount}-photo composition emphasizing clarity, geometry, and color contrast.`;
  }
  return `Curated minimalist layout offering visual rhythm and balanced breathing room.`;
}

async function resolveImageBase64(imgInput: string): Promise<string | null> {
  try {
    if (!imgInput) return null;
    if (imgInput.startsWith("data:image")) {
      return imgInput.split(",")[1] || null;
    }
    if (imgInput.startsWith("/") || imgInput.startsWith("demo/")) {
      const cleanPath = imgInput.replace(/^\/+/, "");
      const fullPath = path.join(process.cwd(), "public", cleanPath);
      if (fs.existsSync(fullPath)) {
        const buffer = await fs.promises.readFile(fullPath);
        return buffer.toString("base64");
      }
    }
    if (imgInput.startsWith("http://") || imgInput.startsWith("https://")) {
      const res = await fetch(imgInput, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return Buffer.from(arrayBuf).toString("base64");
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      images = [],
      current_layout_id = "grid_2x2",
      recent_template_ids = [],
      scene_summary = null,
      photo_count = null,
    } = body;

    // 1. Try Python backend first if online
    try {
      const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/ai/suggest-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          current_layout_id,
          recent_template_ids,
          scene_summary,
          photo_count,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (pyRes.ok) {
        const pyData = await pyRes.json();
        return NextResponse.json(pyData);
      }
    } catch {
      // Python backend not running; execute Node.js implementation
    }

    // 2. Load templates from library
    const allPresets = loadPresets();
    if (!allPresets || allPresets.length === 0) {
      return NextResponse.json(
        { error: "Template library could not be loaded." },
        { status: 500 }
      );
    }

    const currentCount = photo_count || (images && images.length > 0 ? images.length : 4);
    const recentsSet = new Set(Array.isArray(recent_template_ids) ? recent_template_ids : []);
    const currentId = (current_layout_id || "").trim();

    // 3. Resolve or extract scene summary
    let summary: string = scene_summary || "";

    if (!summary && images && images.length > 0) {
      // Attempt quick vision analysis via Ollama
      try {
        const base64List: string[] = [];
        for (const img of images.slice(0, 3)) {
          const b64 = await resolveImageBase64(img);
          if (b64) base64List.push(b64);
        }

        if (base64List.length > 0) {
          const visionRes = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: VISION_MODEL,
              prompt: "Describe the combined scene, subject matter, lighting, mood, color palette, and collective aesthetic across these photos in 2 sentences.",
              images: base64List,
              stream: false,
              options: { temperature: 0.2, num_predict: 80 },
            }),
            signal: AbortSignal.timeout(25000),
          });

          if (visionRes.ok) {
            const vData = await visionRes.json();
            summary = (vData.response || "").trim();
          }
        }
      } catch {
        // Fallback default
        summary = "A stylized visual composition captured with artistic lighting and balanced aesthetics.";
      }
    }

    if (!summary) {
      summary = "A curated collection of photos captured with thoughtful composition and balanced lighting.";
    }

    // 4. Score and filter candidates
    const styleScores = evaluateAestheticScores(summary);

    interface ScoredPreset {
      preset: LayoutPreset;
      score: number;
      category: string;
    }

    const scored: ScoredPreset[] = [];

    for (const preset of allPresets) {
      if (!preset.layout_id || preset.layout_id === currentId) {
        continue; // Never recommend current template
      }

      const slotLen = preset.slots?.length || 4;
      const cat = preset.category || "Minimalist";
      let score = 0;

      // Slot count compatibility
      if (slotLen === currentCount) {
        score += 50;
      } else if (Math.abs(slotLen - currentCount) === 1) {
        score += 20;
      } else {
        score += 5;
      }

      // Aesthetic category affinity
      const catBonus = styleScores[cat] || 1.0;
      score += catBonus * 10;

      // Deduplication penalty for recently recommended layouts
      if (recentsSet.has(preset.layout_id)) {
        score -= 30;
      }

      scored.push({ preset, score, category: cat });
    }

    scored.sort((a, b) => b.score - a.score);

    // 5. Select 4–5 diverse, distinct candidates
    const selected: any[] = [];
    const seenIds = new Set<string>();
    const categoryCounts: Record<string, number> = {};

    for (const item of scored) {
      if (selected.length >= 5) break;
      const pid = item.preset.layout_id;
      const cat = item.category;

      if (seenIds.has(pid)) continue;
      // Cap at 2 per category for visual diversity
      if ((categoryCounts[cat] || 0) >= 2 && selected.length < 4) continue;

      seenIds.add(pid);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      selected.push({
        layout_id: pid,
        name: item.preset.name || pid,
        category: cat,
        photo_count: item.preset.slots?.length || currentCount,
        match_reason: generateMatchReason(item.preset, summary, currentCount),
        score: Math.round(item.score * 10) / 10,
        preset: item.preset,
      });
    }

    // Fill to at least 4 if needed
    if (selected.length < 4) {
      for (const item of scored) {
        if (selected.length >= 4) break;
        const pid = item.preset.layout_id;
        if (!seenIds.has(pid)) {
          seenIds.add(pid);
          selected.push({
            layout_id: pid,
            name: item.preset.name || pid,
            category: item.category,
            photo_count: item.preset.slots?.length || currentCount,
            match_reason: generateMatchReason(item.preset, summary, currentCount),
            score: Math.round(item.score * 10) / 10,
            preset: item.preset,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      recommendations: selected,
      scene_summary: summary,
      total: selected.length,
    });
  } catch (err: any) {
    console.error("[API AI Suggest Templates Error]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate template recommendations." },
      { status: 500 }
    );
  }
}
