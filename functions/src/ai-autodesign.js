/**
 * AI Auto Design (full album generation)
 * Produces a coherent design plan (design system + pages) from photo metadata.
 */
/* eslint-disable require-jsdoc, valid-jsdoc, max-len */

const OpenAI = require("openai");
const aiStory = require("./ai-story");

function mulberry32(seedInt) {
  let a = seedInt >>> 0;
  return function() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seedStr) {
  const s = String(seedStr || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured.");
  }
  return new OpenAI({apiKey});
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function safeJsonParse(content) {
  const clean = String(content || "")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
  return JSON.parse(clean);
}

function basicFallbackPlan(photos, lang, seed) {
  const isHe = String(lang || "en").toLowerCase().startsWith("he");
  const rnd = mulberry32(hashSeed(seed));

  const ordered = (photos || []).map((p) => ({...p}))
      .sort((a, b) => {
        const da = Date.parse(String(a.date || a.creationTime || "")) || 0;
        const db = Date.parse(String(b.date || b.creationTime || "")) || 0;
        return da - db;
      });

  const templates = ["classic", "botanical", "archive", "noir-film", "bauhaus-pop"];
  const templateId = templates[Math.floor(rnd() * templates.length)] || "classic";

  const backgroundTextureIds = [
    templateId,
    "linen-sage",
    "paper-cream",
    "grainy-noir",
    "sky-mist",
    "terracotta-wash",
    "gallery-neutral",
  ].filter(Boolean);

  const pageFrameIds = [
    "frame-minimal-floating",
    "frame-corners-soft",
    "frame-double-ink",
    "frame-classic-gold",
    "frame-diagonal",
    "frame-polaroid",
  ];

  const imageFramesByVibe = {
    "classic": ["imgframe-minimal-hairline", "imgframe-ink-double", "imgframe-classic-gold", "imgframe-dots-gold"],
    "botanical": ["imgframe-botanical-corners", "imgframe-oval-laurel", "imgframe-watercolor", "imgframe-scallop"],
    "archive": ["imgframe-stitched", "imgframe-polaroid", "imgframe-ink-double"],
    "noir-film": ["imgframe-filmstrip", "imgframe-geo-lines", "imgframe-neon"],
    "bauhaus-pop": ["imgframe-geo-lines", "imgframe-neon", "imgframe-watercolor"],
  };
  const imageFrames = imageFramesByVibe[templateId] || imageFramesByVibe.classic;

  const textStylesByVibe = {
    "classic": ["style-minimal-caps", "style-bold-serif", "style-minimal-shadow"],
    "botanical": ["style-handwritten", "style-elegant-gold", "style-bold-serif"],
    "archive": ["style-vintage-type", "style-stamp"],
    "noir-film": ["style-outline", "style-gradient-blue", "style-minimal-caps"],
    "bauhaus-pop": ["style-retro-pop", "style-neon-glow"],
  };
  const textStyles = textStylesByVibe[templateId] || textStylesByVibe.classic;

  const layouts = ["single", "two-vertical", "two-horizontal", "three-left", "three-right", "four-grid", "collage-5", "collage-6"];
  const pages = [];

  const desiredPages = Math.max(8, Math.min(18, Math.round(ordered.length / 2)));
  let cursor = 0;
  for (let pi = 0; pi < desiredPages; pi++) {
    const layout = layouts[(pi + Math.floor(rnd() * 3)) % layouts.length];
    const slotsCount = layout === "single" ? 1 :
      (layout === "two-horizontal" || layout === "two-vertical") ? 2 :
        (layout === "three-left" || layout === "three-right") ? 3 :
          layout === "four-grid" ? 4 : (layout === "collage-5" ? 5 : 6);

    const addTextSlot = (pi % 4 === 1) && slotsCount >= 2; // sprinkle text blocks
    const slots = [];

    for (let si = 0; si < slotsCount; si++) {
      if (addTextSlot && si === 0) {
        const content = isHe ? "רגעים יפים" : "Beautiful moments";
        slots.push({
          type: "text",
          content,
          styleId: textStyles[Math.floor(rnd() * textStyles.length)] || "style-minimal-caps",
          fontSize: Math.floor(24 + rnd() * 22),
          rotation: Math.floor((rnd() - 0.5) * 6),
          shadowStrength: Math.floor(rnd() * 30),
        });
        continue;
      }

      const p = ordered[cursor++];
      if (!p) break;
      const useFrame = rnd() < 0.28;
      const shape = rnd() < 0.12 ? "circle" : (rnd() < 0.35 ? "rounded" : "rect");
      slots.push({
        type: "photo",
        photoIndex: p.index ?? (cursor - 1),
        shape,
        frameId: useFrame ? (imageFrames[Math.floor(rnd() * imageFrames.length)] || null) : null,
        caption: rnd() < 0.35 ? (isHe ? "רגע קטן ומיוחד" : "A small special moment") : "",
      });
    }

    const bgId = backgroundTextureIds[Math.floor(rnd() * backgroundTextureIds.length)] || null;
    const pageFrameId = (rnd() < 0.18) ? (pageFrameIds[Math.floor(rnd() * pageFrameIds.length)] || null) : null;
    pages.push({
      layout,
      photoSpacing: Math.floor(10 + rnd() * 16),
      backgroundTextureId: bgId,
      pageFrameId,
      pageCaption: "",
      slots,
    });
    if (cursor >= ordered.length) break;
  }

  const title = isHe ? "האלבום שלי" : "My Album";
  return {
    success: true,
    plan: {
      seed,
      lang: isHe ? "he" : "en",
      templateId,
      globalCornerRadius: Math.floor(8 + rnd() * 10),
      cover: {
        title,
        subtitle: isHe ? "נוצר בעזרת AI" : "Generated with AI",
        photoIndex: ordered[0]?.index ?? 0,
        photoShape: rnd() < 0.5 ? "rounded" : "rect",
        photoFrameId: rnd() < 0.35 ? (imageFrames[Math.floor(rnd() * imageFrames.length)] || null) : null,
        titleStyleId: textStyles[Math.floor(rnd() * textStyles.length)] || "style-minimal-caps",
      },
      backCover: {
        text: isHe ? "תודה שצפית באלבום" : "Thank you for viewing",
        subtitle: "",
        textStyleId: textStyles[Math.floor(rnd() * textStyles.length)] || "style-minimal-caps",
      },
      pages,
    },
  };
}

async function generateAutoDesignPlan(photos, opts = {}) {
  const lang = String(opts.lang || "en");
  const isHe = lang.toLowerCase().startsWith("he");
  const seed = String(opts.seed || Date.now());

  if (!Array.isArray(photos) || photos.length === 0) {
    return {success: false, error: "No photos provided"};
  }

  // Enrich with story (ordering + theme hints). If OpenAI is missing, fallback.
  let story = null;
  try {
    const storyRes = await aiStory.detectStoryWithAI(photos);
    if (storyRes?.success) story = storyRes.story;
  } catch (e) {
    // ignore
  }

  const allowedTemplates = [
    {id: "classic", vibe: "clean, minimal, lots of whitespace"},
    {id: "botanical", vibe: "warm, natural, botanical accents"},
    {id: "archive", vibe: "sepia, typewriter, vintage paper"},
    {id: "noir-film", vibe: "cinematic, dark, filmstrip"},
  ];

  const allowedLayouts = [
    "single",
    "two-horizontal",
    "two-vertical",
    "three-left",
    "three-right",
    "four-grid",
    "collage-5",
    "collage-6",
  ];

  // These must match IMAGE_FRAMES ids used in both frontend and PDF generator.
  const allowedImageFrames = [
    "imgframe-classic-gold",
    "imgframe-stitched",
    "imgframe-polaroid",
    "imgframe-artdeco",
    "imgframe-botanical-corners",
    "imgframe-beaded",
    "imgframe-ink-double",
    "imgframe-scallop",
    "imgframe-neon",
    "imgframe-minimal-hairline",
    "imgframe-dots-gold",
    "imgframe-filmstrip",
    "imgframe-watercolor",
    "imgframe-geo-lines",
    "imgframe-oval-laurel",
  ];

  const allowedBackgroundTextures = [
    "classic",
    "botanical",
    "archive",
    "noir-film",
    "bauhaus-pop",
    "linen-sage",
    "paper-cream",
    "grainy-noir",
    "sky-mist",
    "terracotta-wash",
    "gallery-neutral",
  ];

  const allowedPageFrames = [
    "frame-classic-gold",
    "frame-modern-bold",
    "frame-elegant-serif",
    "frame-art-deco",
    "frame-corner-flourish",
    "frame-minimal-floating",
    "frame-double-ink",
    "frame-corners-soft",
    "frame-dots-fine",
    "frame-vignette-oval",
    "frame-polaroid",
    "frame-diagonal",
  ];

  const allowedTextStyles = [
    "style-retro-pop",
    "style-neon-glow",
    "style-elegant-gold",
    "style-vintage-type",
    "style-comic-fun",
    "style-minimal-shadow",
    "style-bold-serif",
    "style-stamp",
    "style-outline",
    "style-gradient-blue",
    "style-handwritten",
    "style-minimal-caps",
  ];

  const photoMeta = photos.map((p) => ({
    index: clampInt(p?.index, 0, photos.length - 1, 0),
    date: p?.date || p?.creationTime || null,
    location: p?.location || null,
    filename: p?.filename || null,
  }));

  // Use OpenAI to produce a full plan
  try {
    const openai = getOpenAIClient();

    const prompt = `You are an elite photo book designer.

Goal: Create ONE coherent design system and a full album layout plan from the given photos.
The result must feel curated, consistent, and beautiful — not random colors.
Every run should vary (use the provided seed to introduce variation).

Language: ${isHe ? "Hebrew (he)" : "English (en)"}.
Seed: ${seed}

Constraints:
- Choose ONE templateId from this list only: ${JSON.stringify(allowedTemplates)}
- globalCornerRadius: integer 0..24
- backgroundTextureId: null or one of: ${JSON.stringify(allowedBackgroundTextures)}
- pageFrameId: null or one of: ${JSON.stringify(allowedPageFrames)}
- text styleId: one of: ${JSON.stringify(allowedTextStyles)}
- slot.type: "photo" or "text"
- photoShape: one of ["rect","rounded","circle","oval"]
- photoFrameId: either null or one of: ${JSON.stringify(allowedImageFrames)}
- layout must be one of: ${JSON.stringify(allowedLayouts)}
- Output between 8 and 18 pages (each page is a single page, not spreads).
- Use each photo at most once, prefer using the most relevant photos first.
- Add captions for SOME photos (not all). Captions must be short (3-8 words) and in the chosen language.
- Use frames for SOME photos (not all). Use at least 3 different frame ids across the album if you use frames.
- Vary layouts: use at least 4 different layouts across the album; do not repeat the same layout more than 2 pages in a row.
- Vary backgrounds: use at least 2 different backgroundTextureId values across the album (can repeat, but not all pages same).
- Add text blocks: include 2-5 pages where one slot is a TEXT block instead of a photo (type="text").
- Cover/back cover text should be elegant and suitable for print.

Story hint (may be null): ${JSON.stringify(story || null)}

Photos (metadata only):
${JSON.stringify(photoMeta, null, 2)}

Return JSON only in this exact shape:
{
  "templateId": "classic",
  "globalCornerRadius": 12,
  "cover": { "title": "...", "subtitle": "...", "photoIndex": 0, "photoShape": "rounded", "photoFrameId": null, "titleStyleId": "style-minimal-caps", "backgroundTextureId": null },
  "backCover": { "text": "...", "subtitle": "...", "textStyleId": "style-minimal-caps", "backgroundTextureId": null },
  "pages": [
    {
      "layout": "two-horizontal",
      "photoSpacing": 14,
      "backgroundTextureId": null,
      "pageFrameId": null,
      "pageCaption": "",
      "slots": [
        { "type": "photo", "photoIndex": 0, "shape": "rounded", "frameId": null, "caption": "" },
        { "type": "text", "content": "…", "styleId": "style-minimal-caps", "fontSize": 32, "rotation": 0, "shadowStrength": 0 }
      ]
    }
  ]
}

Notes:
- If a layout requires N slots, provide up to N slot objects; frontend will ignore extras.
- captions: include empty string when no caption.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a meticulous designer. Return VALID JSON only, no markdown, no commentary.",
        },
        {role: "user", content: prompt},
      ],
      temperature: 0.9,
      max_tokens: 2200,
    });

    const content = response.choices?.[0]?.message?.content;
    const plan = safeJsonParse(content);

    // Light validation + sanitization
    if (!plan || typeof plan !== "object") throw new Error("Invalid plan");
    if (!allowedTemplates.some((t) => t.id === plan.templateId)) throw new Error("Invalid templateId");
    const pages = Array.isArray(plan.pages) ? plan.pages : [];
    if (!pages.length) throw new Error("No pages");

    plan.globalCornerRadius = clampInt(plan.globalCornerRadius, 0, 24, 12);
    plan.pages = pages.slice(0, 24).map((pg) => ({
      layout: allowedLayouts.includes(pg.layout) ? pg.layout : "two-horizontal",
      photoSpacing: clampInt(pg.photoSpacing, 0, 40, 14),
      backgroundTextureId: (pg.backgroundTextureId === null) ? null : (allowedBackgroundTextures.includes(String(pg.backgroundTextureId)) ? String(pg.backgroundTextureId) : null),
      pageFrameId: (pg.pageFrameId === null) ? null : (allowedPageFrames.includes(String(pg.pageFrameId)) ? String(pg.pageFrameId) : null),
      pageCaption: typeof pg.pageCaption === "string" ? pg.pageCaption : "",
      slots: Array.isArray(pg.slots) ? pg.slots.map((s) => {
        const type = String(s.type || "photo");
        if (type === "text") {
          return {
            type: "text",
            content: String(s.content || ""),
            styleId: allowedTextStyles.includes(String(s.styleId)) ? String(s.styleId) : "style-minimal-caps",
            fontSize: clampInt(s.fontSize, 14, 72, 32),
            rotation: clampInt(s.rotation, -20, 20, 0),
            shadowStrength: clampInt(s.shadowStrength, 0, 100, 0),
          };
        }
        return {
          type: "photo",
          photoIndex: clampInt(s.photoIndex, 0, photos.length - 1, 0),
          shape: ["rect", "rounded", "circle", "oval"].includes(String(s.shape)) ? String(s.shape) : "rounded",
          frameId: s.frameId === null ? null : (allowedImageFrames.includes(String(s.frameId)) ? String(s.frameId) : null),
          caption: typeof s.caption === "string" ? s.caption : "",
        };
      }) : [],
    }));

    // cover sanitize
    plan.cover = plan.cover || {};
    plan.cover.photoIndex = clampInt(plan.cover.photoIndex, 0, photos.length - 1, 0);
    plan.cover.photoShape = ["rect", "rounded", "circle", "oval"].includes(String(plan.cover.photoShape)) ? String(plan.cover.photoShape) : "rounded";
    plan.cover.photoFrameId = plan.cover.photoFrameId === null ? null :
      (allowedImageFrames.includes(String(plan.cover.photoFrameId)) ? String(plan.cover.photoFrameId) : null);
    plan.cover.titleStyleId = allowedTextStyles.includes(String(plan.cover.titleStyleId)) ? String(plan.cover.titleStyleId) : "style-minimal-caps";
    plan.cover.backgroundTextureId = plan.cover.backgroundTextureId === null ? null :
      (allowedBackgroundTextures.includes(String(plan.cover.backgroundTextureId)) ? String(plan.cover.backgroundTextureId) : null);
    plan.cover.title = String(plan.cover.title || (isHe ? "האלבום שלי" : "My Album"));
    plan.cover.subtitle = String(plan.cover.subtitle || "");

    plan.backCover = plan.backCover || {};
    plan.backCover.text = String(plan.backCover.text || (isHe ? "תודה שצפית באלבום" : "Thank you for viewing"));
    plan.backCover.subtitle = typeof plan.backCover.subtitle === "string" ? plan.backCover.subtitle : "";
    plan.backCover.textStyleId = allowedTextStyles.includes(String(plan.backCover.textStyleId)) ? String(plan.backCover.textStyleId) : "style-minimal-caps";
    plan.backCover.backgroundTextureId = plan.backCover.backgroundTextureId === null ? null :
      (allowedBackgroundTextures.includes(String(plan.backCover.backgroundTextureId)) ? String(plan.backCover.backgroundTextureId) : null);

    return {success: true, plan: {...plan, seed, lang: isHe ? "he" : "en"}};
  } catch (e) {
    console.error("generateAutoDesignPlan: AI failed, using fallback:", e?.message || e);
    return basicFallbackPlan(photos, lang, seed);
  }
}

module.exports = {
  generateAutoDesignPlan,
};

