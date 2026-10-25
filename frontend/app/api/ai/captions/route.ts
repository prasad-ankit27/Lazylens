import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const OLLAMA_URL = process.env.OLLAMA_API_URL || "http://localhost:11434";
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || "llava";
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL || "gemma2:2b";
const PYTHON_BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface CaptionItem {
  tone: string;
  label: string;
  text: string;
}

const TONES_CONFIG = [
  { tone: "aesthetic", label: "Aesthetic" },
  { tone: "witty", label: "Witty" },
  { tone: "hinglish", label: "Hinglish" },
  { tone: "story", label: "Storytelling" },
  { tone: "punchy", label: "Punchy" },
];

function normalizeCaption(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function isDuplicate(candidate: string, recents: string[], threshold = 0.7): boolean {
  const normC = normalizeCaption(candidate);
  if (!normC) return true;
  const setC = new Set(normC.split(" "));

  for (const r of recents) {
    const normR = normalizeCaption(r);
    if (normC === normR) return true;
    const setR = new Set(normR.split(" "));
    let intersection = 0;
    for (const w of setC) {
      if (setR.has(w)) intersection++;
    }
    const union = new Set([...setC, ...setR]).size;
    if (union > 0 && intersection / union >= threshold) {
      return true;
    }
  }
  return false;
}

async function resolveImageBase64(imgInput: string): Promise<string | null> {
  try {
    if (!imgInput) return null;

    // 1. Data URI
    if (imgInput.startsWith("data:image")) {
      const parts = imgInput.split(",");
      return parts[1] || null;
    }

    // 2. Relative local public path (e.g. /demo/demo1.jpg)
    if (imgInput.startsWith("/") || imgInput.startsWith("demo/")) {
      const cleanPath = imgInput.replace(/^\/+/, "");
      const fullPath = path.join(process.cwd(), "public", cleanPath);
      if (fs.existsSync(fullPath)) {
        const buffer = await fs.promises.readFile(fullPath);
        return buffer.toString("base64");
      }
    }

    // 3. Remote URL (e.g. Unsplash)
    if (imgInput.startsWith("http://") || imgInput.startsWith("https://")) {
      const res = await fetch(imgInput, { signal: AbortSignal.timeout(12000) });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return Buffer.from(arrayBuf).toString("base64");
      }
    }

    return null;
  } catch (err) {
    console.warn(`[API AI Captions] Failed to resolve image to base64:`, err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { images, recent_captions = [], title, template_name } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required to generate captions." },
        { status: 400 }
      );
    }

    // 1. Check if Python backend is available
    try {
      const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/ai/captions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          recent_captions,
          title,
          template_name,
        }),
        signal: AbortSignal.timeout(3000), // quick check
      });

      if (pyRes.ok) {
        const pyData = await pyRes.json();
        return NextResponse.json(pyData);
      }
    } catch {
      // Python backend not running; proceed directly with local Ollama
    }

    // 2. Verify Ollama is reachable
    try {
      const tagsRes = await fetch(`${OLLAMA_URL}/api/tags`, {
        signal: AbortSignal.timeout(3500),
      });
      if (!tagsRes.ok) {
        return NextResponse.json(
          {
            error: `Ollama AI service returned status ${tagsRes.status}. Please ensure Ollama is running at ${OLLAMA_URL} with models '${VISION_MODEL}' and '${TEXT_MODEL}'.`,
          },
          { status: 503 }
        );
      }
    } catch {
      return NextResponse.json(
        {
          error: `Ollama AI service is offline or unreachable at ${OLLAMA_URL}. Please start Ollama and ensure models '${VISION_MODEL}' and '${TEXT_MODEL}' are pulled.`,
        },
        { status: 503 }
      );
    }

    // 3. Encode up to 4 images for multi-image vision analysis
    const base64List: string[] = [];
    for (const img of images.slice(0, 4)) {
      const b64 = await resolveImageBase64(img);
      if (b64) base64List.push(b64);
    }

    if (base64List.length === 0) {
      return NextResponse.json(
        { error: "Unable to load or decode any images from the active slide for AI vision analysis." },
        { status: 422 }
      );
    }

    // 4. Multi-Image Scene Analysis via Ollama (llava)
    const visionPrompt =
      "You are an expert visual director. Describe the combined scene, subject matter, " +
      "lighting, mood, color palette, and collective aesthetic across these photos in 2-3 vivid sentences. " +
      "Focus on the actual setting, human presence, ambiance, and activity depicted.";

    const visionRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        prompt: visionPrompt,
        images: base64List,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 90,
        },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!visionRes.ok) {
      const errText = await visionRes.text();
      return NextResponse.json(
        { error: `Vision analysis failed: ${errText || visionRes.statusText}` },
        { status: 502 }
      );
    }

    const visionData = await visionRes.json();
    const sceneSummary: string = (visionData.response || "").trim();

    if (!sceneSummary) {
      return NextResponse.json(
        { error: "Vision model produced an empty scene description." },
        { status: 502 }
      );
    }

    // 5. Generate 5 Distinct Captions via Ollama (gemma2:2b) with Deduplication
    const recents: string[] = Array.isArray(recent_captions)
      ? recent_captions.filter((r) => typeof r === "string" && r.trim().length > 0)
      : [];

    let avoidClause = "";
    if (recents.length > 0) {
      avoidClause =
        "\n\nCRITICAL DEDUPLICATION RULE:\n" +
        "Do NOT repeat, duplicate, or closely paraphrase any of these recently used captions:\n" +
        recents.slice(-10).map((r) => `- "${r}"`).join("\n") +
        "\nProvide fresh, distinct phrasing.";
    }

    const copyPrompt =
      "You are an elite creative social media copywriter. " +
      "Analyze the provided photo collection scene summary and craft exactly 5 distinct captions " +
      "tailored specifically to its depicted mood, lighting, people, and aesthetic.\n" +
      "Each caption must reflect one of these 5 tones:\n" +
      "1. aesthetic: minimal, lowercase, poetic, atmospheric\n" +
      "2. witty: clever, relatable, lighthearted humor\n" +
      "3. hinglish: urban natural Hindi-English blend (e.g. vibe, scene, yaar, sorted, mahaul)\n" +
      "4. story: narrative, experiential, capturing the collective memory\n" +
      "5. punchy: short, bold, impactful (3-6 words)\n" +
      avoidClause +
      "\n\nYou MUST return ONLY a JSON object formatted exactly as:\n" +
      "{\n" +
      '  "captions": [\n' +
      '    {"tone": "aesthetic", "label": "Aesthetic", "text": "..."},\n' +
      '    {"tone": "witty", "label": "Witty", "text": "..."},\n' +
      '    {"tone": "hinglish", "label": "Hinglish", "text": "..."},\n' +
      '    {"tone": "story", "label": "Storytelling", "text": "..."},\n' +
      '    {"tone": "punchy", "label": "Punchy", "text": "..."}\n' +
      "  ]\n" +
      "}\n\nScene Summary:\n\"" +
      sceneSummary +
      "\"\n\nJSON Output:";

    let finalCaptions: CaptionItem[] = [];

    // Bounded retry up to 2 attempts for duplicates
    for (let attempt = 0; attempt < 2; attempt++) {
      const textRes = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: TEXT_MODEL,
          prompt: copyPrompt,
          format: "json",
          stream: false,
          options: {
            temperature: 0.72 + attempt * 0.1,
            top_p: 0.9,
            num_predict: 400,
          },
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (!textRes.ok) break;

      const textData = await textRes.json();
      const rawText: string = textData.response || "";

      try {
        const parsed = JSON.parse(rawText.replace(/```(?:json)?/g, "").trim());
        const rawList = parsed.captions || [];

        const extracted: CaptionItem[] = [];
        for (let i = 0; i < rawList.length; i++) {
          const item = rawList[i];
          const toneMeta = TONES_CONFIG[i % TONES_CONFIG.length];
          let cText = "";
          let cTone = toneMeta.tone;
          let cLabel = toneMeta.label;

          if (typeof item === "string") {
            cText = item;
          } else if (item && typeof item === "object") {
            cText = item.text || item.caption || "";
            if (item.tone) cTone = item.tone;
            if (item.label) cLabel = item.label;
          }

          cText = cText.trim().replace(/^["']|["']$/g, "");
          if (cText) {
            extracted.push({
              tone: cTone,
              label: cLabel,
              text: cTone === "aesthetic" ? cText.toLowerCase() : cText,
            });
          }
        }

        const unique: CaptionItem[] = [];
        const seenTexts = [...recents];

        for (const cand of extracted) {
          if (!isDuplicate(cand.text, seenTexts)) {
            unique.push(cand);
            seenTexts.push(cand.text);
          }
        }

        if (unique.length >= 5) {
          finalCaptions = unique.slice(0, 5);
          break;
        } else if (unique.length > finalCaptions.length) {
          finalCaptions = unique;
        }
      } catch (parseErr) {
        console.warn(`[API AI Captions] JSON parse attempt ${attempt + 1} failed:`, parseErr);
      }
    }

    // Graceful fallback to reach exactly 5 distinct items based on the real sceneSummary
    if (finalCaptions.length < 5) {
      const existingTones = new Set(finalCaptions.map((c) => c.tone));
      const snippet = sceneSummary.split(".")[0].trim();

      for (const t of TONES_CONFIG) {
        if (finalCaptions.length >= 5) break;
        if (!existingTones.has(t.tone)) {
          let text = "";
          if (t.tone === "aesthetic") text = `quiet framed moments: ${snippet.toLowerCase()}.`;
          else if (t.tone === "witty") text = `Here for the vibe: ${snippet}.`;
          else if (t.tone === "hinglish") text = `Poora scene sorted hai boss — ${snippet}.`;
          else if (t.tone === "story") text = `These are the memories we keep: ${snippet}.`;
          else text = "Moments in focus.";

          if (!isDuplicate(text, [...finalCaptions.map((c) => c.text), ...recents])) {
            finalCaptions.push({ tone: t.tone, label: t.label, text });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      captions: finalCaptions.slice(0, 5),
      scene_summary: sceneSummary,
      total: finalCaptions.slice(0, 5).length,
    });
  } catch (err: any) {
    console.error("[API AI Captions Error]", err);
    return NextResponse.json(
      { error: err?.message || "An unexpected error occurred during caption generation." },
      { status: 500 }
    );
  }
}
