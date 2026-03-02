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
  const shapes = ["rect", "rounded", "circle", "oval"];
  const hebrewFonts = ["fredoka", "heebo", "amatic-sc", "frank-ruhl-libre", "varela-round", "rubik", "playpen-sans-hebrew"];
  const pages = [];

  // Use ALL photos — up to 50 pages, average ~2-3 photos per page
  const avgPhotosPerPage = 2.5;
  const desiredPages = Math.max(8, Math.min(50, Math.ceil(ordered.length / avgPhotosPerPage)));
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
      const shape = shapes[Math.floor(rnd() * shapes.length)];
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
      fontId: hebrewFonts[Math.floor(rnd() * hebrewFonts.length)],
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
  const userRequest = String(opts.userRequest || "").trim();

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

  // Full background texture catalog with mood hints for AI selection
  const allowedBackgroundTextures = [
    {id: "classic", mood: "clean minimal whitespace geometric"},
    {id: "botanical", mood: "warm natural green botanical vintage"},
    {id: "noir-film", mood: "cinematic dark filmstrip noir"},
    {id: "bauhaus-pop", mood: "graphic bold colorful modern artistic"},
    {id: "archive", mood: "vintage sepia paper typewriter old"},
    {id: "linen-sage", mood: "clean light paper fibers elegant"},
    {id: "paper-cream", mood: "warm rice paper soft traditional"},
    {id: "grainy-noir", mood: "dark grunge moody textured noir"},
    {id: "sky-mist", mood: "light airy minimal cream"},
    {id: "terracotta-wash", mood: "concrete urban industrial warm"},
    {id: "gallery-neutral", mood: "striped brick pattern neutral"},
    {id: "soft-sunset", mood: "romantic pink gradient warm sunset love"},
    {id: "ocean-waves", mood: "sea ocean beach water blue summer"},
    {id: "deep-space", mood: "dark cosmic stars night space"},
    {id: "modern-memphis", mood: "fun playful colorful kids geometric"},
    {id: "rose-gold-foil", mood: "elegant luxury wedding romantic pink gold"},
    {id: "lush-forest", mood: "nature green forest deep jungle"},
    {id: "midnight-velvet", mood: "dark luxury elegant night purple"},
    {id: "candy-stripes", mood: "fun party stripes pink playful kids"},
    {id: "blueprint-grid", mood: "technical grid blue architect modern"},
    {id: "golden-sands", mood: "beach desert warm sand vacation golden"},
    {id: "cyber-grid", mood: "tech neon cyberpunk dark modern grid"},
    {id: "floral-damask", mood: "vintage floral elegant purple pattern"},
    {id: "mint-fresh", mood: "clean fresh baby mint pastel soft"},
    {id: "monochrome-triangles", mood: "graphic modern minimal geometric grey"},
    {id: "autumn-warmth", mood: "warm autumn red orange fall cozy"},
    {id: "lavender-mist", mood: "soft purple elegant calm lavender"},
    {id: "honeycomb", mood: "golden warm pattern geometric honey"},
    {id: "polka-pop", mood: "fun red playful dots retro party"},
    {id: "classic-marble", mood: "elegant luxury marble texture white"},
    {id: "frosted-glass", mood: "modern soft colorful orbs fresh"},
    {id: "hacker-matrix", mood: "tech green dark coding terminal"},
    {id: "sunny-burst", mood: "happy bright yellow sun summer kids"},
    {id: "coral-reef", mood: "ocean pink coral underwater warm"},
    {id: "pure-zen", mood: "minimal zen calm clean white circles"},
    {id: "holographic-foil", mood: "modern iridescent colorful trendy"},
    {id: "cherry-blossom", mood: "spring japanese pink flower romantic"},
    {id: "midnight-chalk", mood: "dark chalkboard slate texture school"},
    {id: "peacock-scales", mood: "exotic colorful teal green pattern"},
    {id: "confetti-party", mood: "celebration party birthday confetti fun"},
    {id: "diagonal-checkers", mood: "retro pattern red geometric"},
    {id: "watercolor-mesh", mood: "art watercolor soft blue green fresh"},
    {id: "retro-waves", mood: "retro vintage waves purple pink"},
    {id: "golden-ratio", mood: "golden elegant spiral mathematical luxury"},
  ];
  const bgIdList = allowedBackgroundTextures.map((b) => b.id);

  // Element categories with mood descriptions for AI selection
  const allowedElementCategories = [
    {category: "beach", mood: "beach summer sea ocean sun waves coastal vacation"},
    {category: "wedding", mood: "wedding love romance heart couple marriage"},
    {category: "baby", mood: "baby cute kids star cloud newborn toddler pastel"},
    {category: "travel", mood: "travel vacation trip pin map adventure explore"},
    {category: "birthday", mood: "birthday party celebration balloon crown cake"},
    {category: "nature", mood: "nature flower leaf spring green garden botanical"},
    {category: "food", mood: "food sweet icecream cake dessert cooking"},
    {category: "animals", mood: "animal pet dog cat wild paws"},
    {category: "music", mood: "music song party note instrument concert"},
    {category: "shapes", mood: "geometric frame design decoration ornament"},
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

  const photoMeta = photos.map((p) => {
    const obj = {index: clampInt(p?.index, 0, photos.length - 1, 0)};
    const date = p?.date || p?.creationTime;
    if (date) obj.date = date;
    if (p?.location) obj.location = p.location;
    if (p?.filename) obj.filename = p.filename;
    return obj;
  });

  // Use OpenAI to produce a full plan
  try {
    const openai = getOpenAIClient();

    const prompt = `You are an elite photo book designer.

Goal: Create ONE coherent design system and a full album layout plan from the given photos.
The result must feel curated, consistent, and beautiful — not just random colors.

${userRequest ? `CRITICAL DIRECTIVE FROM CLIENT: "${userRequest}" \nYou MUST analyze this request and explicitly select backgroundTextureId, elementCategories, pageFrameId, photoFrameId, text styles, and templateId that BEST MATCH the mood, theme, and subjects of this request. Do not default to random.` : `Every run should vary (use the provided seed to introduce variation).`}

Language: ${isHe ? "Hebrew (he)" : "English (en)"}.
${isHe ? "CRITICAL: ALL text content (cover title, cover subtitle, back cover text, photo captions, and text block content) MUST be written in Hebrew. Do NOT use any English text in the output." : ""}
Seed: ${seed}

AVAILABLE BACKGROUNDS (pick by id, use the "mood" field to match the client's request):
${JSON.stringify(allowedBackgroundTextures)}

AVAILABLE DECORATIVE ELEMENT CATEGORIES (pick 0-2 per page, use "mood" to match client's request):
${JSON.stringify(allowedElementCategories)}

Constraints:
- Choose ONE templateId from this list only: ${JSON.stringify(allowedTemplates)}
- globalCornerRadius: integer 0..24
- backgroundTextureId: MUST be one of the background ids listed above. Pick backgrounds that match the mood/theme of the prompt. Use at least 2-3 different backgrounds across the album for visual variety.
- elementCategories: array of 0-2 category strings (e.g. ["beach","nature"]). These add small decorative SVG elements to the page corners. Pick categories that match the album mood. Use [] for clean/minimal pages.
- pageFrameId: null or one of: ${JSON.stringify(allowedPageFrames)}
- text styleId: one of: ${JSON.stringify(allowedTextStyles)}
- slot.type: "photo" or "text"
- photoShape: one of ["rect","rounded","circle","oval"]
- photoFrameId: either null or one of: ${JSON.stringify(allowedImageFrames)}
- layout must be one of: ${JSON.stringify(allowedLayouts)}
- Output between 8 and 20 pages (each page is a single page, not spreads). The backend will automatically generate additional pages to cover ALL remaining photos, so focus on quality design for these first 20 pages.
- Use each photo at most once, prefer using the most relevant photos first. Use as many photos as you can in your pages.
- For each page, include a "fontId" field from this list: ["fredoka","heebo","amatic-sc","frank-ruhl-libre","varela-round","rubik","playpen-sans-hebrew"]. Vary the fonts across pages for visual diversity.
- Add captions for SOME photos (not all). Captions must be short (3-8 words) and in the chosen language.
- Use frames for SOME photos (not all). Use at least 3 different frame ids across the album if you use frames.
- Vary layouts: use at least 4 different layouts across the album; do not repeat the same layout more than 2 pages in a row.
- Add text blocks: include 2-5 pages where one slot is a TEXT block instead of a photo (type="text").
- Cover/back cover text should be elegant and suitable for print.

Story hint (may be null): ${JSON.stringify(story || null)}

Photos (metadata only):
${JSON.stringify(photoMeta, null, 2)}

Return JSON only in this exact shape:
{
  "templateId": "classic",
  "globalCornerRadius": 12,
  "cover": { "title": "...", "subtitle": "...", "photoIndex": 0, "photoShape": "rounded", "photoFrameId": null, "titleStyleId": "style-minimal-caps", "backgroundTextureId": "soft-sunset" },
  "backCover": { "text": "...", "subtitle": "...", "textStyleId": "style-minimal-caps", "backgroundTextureId": "soft-sunset" },
  "pages": [
    {
      "layout": "two-horizontal",
      "photoSpacing": 14,
      "backgroundTextureId": "ocean-waves",
      "elementCategories": ["beach"],
      "pageFrameId": null,
      "fontId": "fredoka",
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
- captions: include empty string when no caption.
- elementCategories: use empty array [] for pages that should stay clean.`;

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
      max_tokens: 6000,
    });

    const content = response.choices?.[0]?.message?.content;
    const plan = safeJsonParse(content);

    // Light validation + sanitization
    if (!plan || typeof plan !== "object") throw new Error("Invalid plan");
    if (!allowedTemplates.some((t) => t.id === plan.templateId)) throw new Error("Invalid templateId");
    const pages = Array.isArray(plan.pages) ? plan.pages : [];
    if (!pages.length) throw new Error("No pages");

    plan.globalCornerRadius = clampInt(plan.globalCornerRadius, 0, 24, 12);
    const hebrewFonts = ["fredoka", "heebo", "amatic-sc", "frank-ruhl-libre", "varela-round", "rubik", "playpen-sans-hebrew"];
    const shapes = ["rect", "rounded", "circle", "oval"];

    plan.pages = pages.slice(0, 50).map((pg, pgIdx) => ({
      layout: allowedLayouts.includes(pg.layout) ? pg.layout : "two-horizontal",
      photoSpacing: clampInt(pg.photoSpacing, 0, 40, 14),
      backgroundTextureId: pg.backgroundTextureId && bgIdList.includes(String(pg.backgroundTextureId)) ? String(pg.backgroundTextureId) : null,
      elementCategories: Array.isArray(pg.elementCategories) ? pg.elementCategories.filter((c) => allowedElementCategories.some((ac) => ac.category === c)).slice(0, 2) : [],
      pageFrameId: pg.pageFrameId && allowedPageFrames.includes(String(pg.pageFrameId)) ? String(pg.pageFrameId) : null,
      fontId: (pg.fontId && hebrewFonts.includes(pg.fontId)) ? pg.fontId : hebrewFonts[pgIdx % hebrewFonts.length],
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
          shape: ["rect", "rounded", "circle", "oval"].includes(String(s.shape)) ? String(s.shape) : shapes[pgIdx % shapes.length],
          frameId: s.frameId === null ? null : (allowedImageFrames.includes(String(s.frameId)) ? String(s.frameId) : null),
          caption: typeof s.caption === "string" ? s.caption : "",
        };
      }) : [],
    }));

    // Auto-fill slots if the AI was lazy and didn't provide them
    let globalCursor = 1; // start from 1 since cover takes 0
    plan.pages.forEach((pg, pgIdx) => {
      if (!pg.slots || pg.slots.length === 0) {
        const slotsCount = pg.layout === "single" ? 1 :
          (pg.layout === "two-horizontal" || pg.layout === "two-vertical") ? 2 :
            (pg.layout === "three-left" || pg.layout === "three-right") ? 3 :
              pg.layout === "four-grid" ? 4 : (pg.layout === "collage-5" ? 5 : 6);

        pg.slots = [];
        for (let i = 0; i < slotsCount; i++) {
          if (globalCursor < photos.length) {
            pg.slots.push({
              type: "photo",
              photoIndex: globalCursor++,
              shape: shapes[(pgIdx + i) % shapes.length],
              frameId: null,
              caption: "",
            });
          }
        }
      }
    });

    // --- CRITICAL: Ensure ALL photos are used ---
    // Track which photo indices are already used
    const usedIndices = new Set();
    if (plan.cover && plan.cover.photoIndex !== undefined) usedIndices.add(plan.cover.photoIndex);
    plan.pages.forEach((pg) => {
      (pg.slots || []).forEach((s) => {
        if (s.type === "photo" && s.photoIndex !== undefined) usedIndices.add(s.photoIndex);
      });
    });

    // Find unused photos
    const unusedIndices = [];
    for (let i = 0; i < photos.length; i++) {
      if (!usedIndices.has(i)) unusedIndices.push(i);
    }

    // Generate additional pages for unused photos (up to 50 total)
    if (unusedIndices.length > 0) {
      let uCursor = 0;
      const rnd = mulberry32(hashSeed(seed + "_extra"));
      while (uCursor < unusedIndices.length && plan.pages.length < 50) {
        const remaining = unusedIndices.length - uCursor;
        // Pick a layout that fits remaining photos
        let layout;
        if (remaining >= 6) layout = "collage-6";
        else if (remaining >= 5) layout = "collage-5";
        else if (remaining >= 4) layout = "four-grid";
        else if (remaining >= 3) layout = allowedLayouts[(plan.pages.length) % 2 === 0 ? 3 : 4]; // three-left or three-right
        else if (remaining >= 2) layout = allowedLayouts[(plan.pages.length) % 2 === 0 ? 1 : 2]; // two-vertical or two-horizontal
        else layout = "single";

        const slotsCount = layout === "single" ? 1 :
          (layout === "two-horizontal" || layout === "two-vertical") ? 2 :
            (layout === "three-left" || layout === "three-right") ? 3 :
              layout === "four-grid" ? 4 : (layout === "collage-5" ? 5 : 6);

        const extraSlots = [];
        for (let i = 0; i < slotsCount && uCursor < unusedIndices.length; i++) {
          extraSlots.push({
            type: "photo",
            photoIndex: unusedIndices[uCursor++],
            shape: shapes[(plan.pages.length + i) % shapes.length],
            frameId: (rnd() < 0.25) ? (allowedImageFrames[Math.floor(rnd() * allowedImageFrames.length)] || null) : null,
            caption: "",
          });
        }

        // Pick background from AI pages or cycle through available
        const existingBgs = plan.pages.map((p) => p.backgroundTextureId).filter(Boolean);
        const bgForPage = existingBgs.length > 0 ? existingBgs[plan.pages.length % existingBgs.length] : bgIdList[Math.floor(rnd() * bgIdList.length)];

        plan.pages.push({
          layout,
          photoSpacing: clampInt(Math.floor(10 + rnd() * 16), 0, 40, 14),
          backgroundTextureId: bgForPage,
          elementCategories: [],
          pageFrameId: null,
          fontId: hebrewFonts[plan.pages.length % hebrewFonts.length],
          pageCaption: "",
          slots: extraSlots,
        });
      }
      console.log(`generateAutoDesignPlan: Added ${plan.pages.length} total pages to cover all ${photos.length} photos (${unusedIndices.length} were unused by AI).`);
    }

    // cover sanitize
    plan.cover = plan.cover || {};
    plan.cover.photoIndex = clampInt(plan.cover.photoIndex, 0, photos.length - 1, 0);
    plan.cover.photoShape = ["rect", "rounded", "circle", "oval"].includes(String(plan.cover.photoShape)) ? String(plan.cover.photoShape) : "rounded";
    plan.cover.photoFrameId = plan.cover.photoFrameId === null ? null :
      (allowedImageFrames.includes(String(plan.cover.photoFrameId)) ? String(plan.cover.photoFrameId) : null);
    plan.cover.titleStyleId = allowedTextStyles.includes(String(plan.cover.titleStyleId)) ? String(plan.cover.titleStyleId) : "style-minimal-caps";
    plan.cover.backgroundTextureId = plan.cover.backgroundTextureId === null ? null :
      (bgIdList.includes(String(plan.cover.backgroundTextureId)) ? String(plan.cover.backgroundTextureId) : null);
    plan.cover.title = String(plan.cover.title || (isHe ? "האלבום שלי" : "My Album"));
    plan.cover.subtitle = String(plan.cover.subtitle || "");

    plan.backCover = plan.backCover || {};
    plan.backCover.text = String(plan.backCover.text || (isHe ? "תודה שצפית באלבום" : "Thank you for viewing"));
    plan.backCover.subtitle = typeof plan.backCover.subtitle === "string" ? plan.backCover.subtitle : "";
    plan.backCover.textStyleId = allowedTextStyles.includes(String(plan.backCover.textStyleId)) ? String(plan.backCover.textStyleId) : "style-minimal-caps";
    plan.backCover.backgroundTextureId = plan.backCover.backgroundTextureId === null ? null :
      (bgIdList.includes(String(plan.backCover.backgroundTextureId)) ? String(plan.backCover.backgroundTextureId) : null);

    return {success: true, plan: {...plan, seed, lang: isHe ? "he" : "en"}};
  } catch (e) {
    console.error("generateAutoDesignPlan: AI failed, using fallback:", e?.message || e);
    return basicFallbackPlan(photos, lang, seed);
  }
}

module.exports = {
  generateAutoDesignPlan,
};

