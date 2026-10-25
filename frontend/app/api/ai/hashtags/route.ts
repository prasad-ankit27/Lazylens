import { NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_API_URL || "http://localhost:11434";
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL || "gemma2:2b";
const PYTHON_BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface HashtagSet {
  id: string;
  category: string;
  label: string;
  tags: string[];
  explanation: string;
}

function normalizeTag(tag: string): string {
  return tag.toLowerCase().replace(/^[#\s]+|[^\w]/g, "");
}

function formatTag(tag: string): string {
  const clean = tag.replace(/^[#\s]+|[^\w]/g, "");
  return clean ? `#${clean}` : "";
}

function isDuplicateSet(candidateTags: string[], recentTags: string[], threshold = 0.55): boolean {
  const normCandidates = new Set(candidateTags.map(normalizeTag).filter(Boolean));
  const normRecents = new Set(recentTags.map(normalizeTag).filter(Boolean));
  if (normCandidates.size === 0 || normRecents.size === 0) return false;

  let intersection = 0;
  normCandidates.forEach((t) => {
    if (normRecents.has(t)) intersection++;
  });
  const unionSize = new Set([...Array.from(normCandidates), ...Array.from(normRecents)]).size;
  return unionSize > 0 && intersection / unionSize >= threshold;
}

function buildGroundedFallback(
  sceneSummary: string,
  recentTags: string[] = []
): HashtagSet[] {
  const summaryLower = (sceneSummary || "").toLowerCase();
  const recentNorm = new Set(recentTags.map(normalizeTag).filter(Boolean));

  const isPortrait = /person|people|portrait|face|woman|man|model|friend/.test(summaryLower);
  const isNature = /nature|mountain|river|trees|water|landscape|outdoor|sky|hiking|lake/.test(summaryLower);
  const isUrban = /city|urban|street|building|neon|architecture|night|indoor/.test(summaryLower);
  const isWarm = /warm|candlelit|sunset|golden|dusk|coffee|cozy|restaurant|food|dining/.test(summaryLower);
  const isMinimal = /minimal|clean|monochrome|modern|white|contrast/.test(summaryLower);

  let set1 = ["#moodygrams", "#aestheticvibes", "#visualambience", "#tonesbox", "#ambientlight", "#visualmood", "#subtleglow"];
  if (isWarm) {
    set1 = ["#goldenhourlight", "#warmvisuals", "#cozyaesthetic", "#warmtones", "#ambientlighting", "#softglow", "#sunlitstories"];
  } else if (isMinimal) {
    set1 = ["#minimalmood", "#cleanlines", "#monochromevibes", "#subtledetails", "#minimalhunter", "#aestheticfeed", "#modernminimalist"];
  }

  let set2 = ["#visualfocus", "#subjectmatter", "#momentcaptured", "#cameraroll", "#dailystory", "#framebyframe"];
  if (isPortrait && isNature) {
    set2 = ["#portraitinnature", "#outdoorportrait", "#exploremore", "#wildernessculture", "#intothewild", "#adventuresoul", "#portraitsinnature"];
  } else if (isPortrait) {
    set2 = ["#portraitmood", "#portraitmode", "#portraitsociety", "#humancanvas", "#facialexpressions", "#portraitcollective", "#storytellingportraits"];
  } else if (isNature) {
    set2 = ["#naturevisuals", "#earthcapture", "#scenicviews", "#wildernessculture", "#landscapecaptures", "#natureaesthetic", "#scenicphotography"];
  } else if (isUrban) {
    set2 = ["#urbanlens", "#cityshots", "#streetscenes", "#metropolis", "#urbanframing", "#cityscape", "#streetdreamsmag"];
  } else if (isWarm) {
    set2 = ["#gatheredtable", "#culinarymoments", "#dinnerstories", "#tableconversations", "#lifestylecuration", "#goodvibesonly"];
  }

  const set3 = [
    "#creatorcommunity", "#visualstorytelling", "#carouselpost", "#curatedfeed",
    "#photogrid", "#creativeflow", "#contentcreators", "#visualnarrative", "#lazylensstudio"
  ];

  const set4 = [
    "#curatedlifestyle", "#artdirection", "#editoriallookbook", "#minimalaesthetic",
    "#paletteharmony", "#understatedluxury", "#selectivefocus", "#editorialtones"
  ];

  const set5 = [
    "#photodump", "#visualdiaries", "#explorepage", "#instamood",
    "#picoftheday", "#postfortheday", "#aestheticpost", "#instacreative"
  ];

  const categories = [
    { id: "set_aesthetic", category: "Aesthetic & Mood", label: "Atmosphere & Tone", pool: set1, expl: "Captures ambient lighting, color palette, and emotional mood." },
    { id: "set_subject", category: "Subject & Activity", label: "Subject Matter", pool: set2, expl: "Highlights primary subjects, scene elements, and real context." },
    { id: "set_community", category: "Creator Community", label: "Visual Storytelling", pool: set3, expl: "Connects with photo curators, carousel makers, and visual storytellers." },
    { id: "set_niche", category: "Curated Niche", label: "Editorial & Clean", pool: set4, expl: "Selective editorial hashtags for nuanced, high-aesthetic discovery." },
    { id: "set_reach", category: "Broad Discovery", label: "High Engagement", pool: set5, expl: "High-reach discovery tags relevant to multi-photo social carousels." },
  ];

  const usedInBatch = new Set<string>();

  return categories.map((cat) => {
    const chosen: string[] = [];
    for (const tag of cat.pool) {
      const norm = normalizeTag(tag);
      if (!recentNorm.has(norm) && !usedInBatch.has(norm)) {
        chosen.push(formatTag(tag));
        usedInBatch.add(norm);
      }
      if (chosen.length >= 6) break;
    }

    if (chosen.length < 5) {
      for (const tag of cat.pool) {
        const formatted = formatTag(tag);
        if (!chosen.includes(formatted)) {
          chosen.push(formatted);
        }
        if (chosen.length >= 5) break;
      }
    }

    return {
      id: cat.id,
      category: cat.category,
      label: cat.label,
      tags: chosen,
      explanation: cat.expl,
    };
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { images = [], recent_hashtags = [], scene_summary = "", title = "LazyLens Post", template_name = "Editorial Grid" } = body;

    // 1. Try Python backend first
    try {
      const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/ai/hashtags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          recent_hashtags,
          scene_summary,
          title,
          template_name,
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (pyRes.ok) {
        const pyData = await pyRes.json();
        if (pyData.hashtag_sets && pyData.hashtag_sets.length === 5) {
          return NextResponse.json(pyData);
        }
      }
    } catch {
      // Backend unavailable; proceed with Node.js fallback / direct Ollama
    }

    // 2. Try direct local Ollama gemma2:2b
    try {
      const prompt = `You are an expert social media curator and hashtag strategist.
Analyze the combined scene of all images in this post: "${scene_summary || "Visual multi-photo collage with portraits and landscapes"}".
Post Title: "${title}"
Template Style: "${template_name}"

Generate exactly 5 distinct hashtag sets in JSON format. Each set must contain 5 to 7 relevant, grounded hashtags.
DO NOT invent fake locations, events, or unverified brands.
DO NOT repeat recently used hashtags: ${JSON.stringify(recent_hashtags.slice(0, 15))}

Enforce these 5 specific categories:
1. 'aesthetic': Aesthetic & Mood (lighting, colors, emotional tone)
2. 'subject': Subject & Activity (exact people, objects, setting, actions visible)
3. 'community': Creator & Photography Community (visual storytelling, carousel, photography)
4. 'niche': Curated & Minimalist Niche (editorial, understated, selective aesthetic)
5. 'high_reach': Broad Reach & Discovery (trending thematic tags for discovery)

Return ONLY a JSON object with this exact schema:
{
  "aesthetic": {"label": "Atmosphere & Tone", "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"], "explanation": "..."},
  "subject": {"label": "Subject Matter", "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"], "explanation": "..."},
  "community": {"label": "Creator Community", "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"], "explanation": "..."},
  "niche": {"label": "Curated Niche", "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"], "explanation": "..."},
  "high_reach": {"label": "Broad Discovery", "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"], "explanation": "..."}
}`;

      const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: TEXT_MODEL,
          prompt,
          format: "json",
          stream: false,
          options: { temperature: 0.72, top_p: 0.9 },
        }),
        signal: AbortSignal.timeout(35000),
      });

      if (ollamaRes.ok) {
        const rawJson = await ollamaRes.json();
        const parsed = JSON.parse(rawJson.response);

        const categoryDefs = [
          { key: "aesthetic", cat: "Aesthetic & Mood", defLabel: "Atmosphere & Tone", defExpl: "Captures ambient lighting, color palette, and emotional mood." },
          { key: "subject", cat: "Subject & Activity", defLabel: "Subject Matter", defExpl: "Highlights primary subjects, scene elements, and real context." },
          { key: "community", cat: "Creator Community", defLabel: "Visual Storytelling", defExpl: "Connects with photo curators and visual storytellers." },
          { key: "niche", cat: "Curated Niche", defLabel: "Editorial & Clean", defExpl: "Selective editorial hashtags for nuanced discovery." },
          { key: "high_reach", cat: "Broad Discovery", defLabel: "High Engagement", defExpl: "High-reach discovery tags for multi-photo social carousels." },
        ];

        const sets: HashtagSet[] = [];
        for (const def of categoryDefs) {
          const item = parsed[def.key] || {};
          const rawTags = Array.isArray(item.tags) ? item.tags : [];
          const cleanTags = rawTags.map(formatTag).filter(Boolean);
          if (cleanTags.length >= 4) {
            sets.push({
              id: `set_${def.key}`,
              category: def.cat,
              label: item.label || def.defLabel,
              tags: cleanTags.slice(0, 8),
              explanation: item.explanation || def.defExpl,
            });
          }
        }

        if (sets.length === 5) {
          const allNewTags = sets.flatMap((s) => s.tags);
          if (!isDuplicateSet(allNewTags, recent_hashtags)) {
            return NextResponse.json({
              success: true,
              hashtag_sets: sets,
              scene_summary: scene_summary || "Visual collection",
              total_sets: 5,
            });
          }
        }
      }
    } catch {
      // Ollama timeout/offline; fallback below
    }

    // 3. Grounded Contextual Fallback
    const fallbackSets = buildGroundedFallback(scene_summary, recent_hashtags);
    return NextResponse.json({
      success: true,
      hashtag_sets: fallbackSets,
      scene_summary: scene_summary || "Visual collection",
      total_sets: 5,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
