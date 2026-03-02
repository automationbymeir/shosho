const express = require("express");
const cors = require("cors");
// const visionService = require("./services/visionService");
const aiAutoDesign = require("./ai-autodesign");

const app = express();
app.use(cors({origin: true}));

/**
 * analyze-photos endpoint
 * Accepts { photos: [ {id, url, ...} ] }
 * Returns { valid_photos: [], trash_photos: [] }
 */
app.post("/analyze-photos", async (req, res) => {
  try {
    const {photos} = req.body;
    if (!photos || !Array.isArray(photos)) {
      return res.status(400).json({error: "Photos array is required"});
    }

    // For now, we'll mark all photos as valid to unblock the flow.
    // Real implementation would analyze brightness/blur here.
    const validPhotos = photos.map((p) => ({...p}));
    const trashPhotos = [];

    // Optional: Real analysis using visionService if needed
    // const analysis = await visionService.batchAnalyzePhotos(photos.map(p => p.url));
    // Implementation of quality checks (blur, dark, etc) would go here

    res.json({
      valid_photos: validPhotos,
      trash_photos: trashPhotos,
    });
  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({error: error.message});
  }
});

/**
 * create endpoint
 * Accepts { user_id, prompt, photos, max_pages, ... }
 * Returns { pages: [...], theme: {...} }
 */
app.post("/create", async (req, res) => {
  try {
    const {prompt, photos, options} = req.body;

    // Convert frontend options to aiAutoDesign options
    const designOptions = {
      lang: (options && options.lang) ? options.lang : "en",
      userRequest: prompt || "", // Pass actual prompt
      seed: prompt || Date.now().toString(),
    };

    // Use existing AI Auto Design logic
    const result = await aiAutoDesign.generateAutoDesignPlan(photos, designOptions);

    if (!result.success) {
      throw new Error(result.error || "Failed to generate design");
    }

    // Map result.plan to expected frontend format (MagicCreateV4 expects `pages`, `theme`)

    // Important: aiAutoDesign.js generates `plan.pages` with `slots`.
    // We need to ensure `result.plan.pages` structure matches what the frontend wants.
    // Frontend code (magic-create-v4.js:290) iterates pages and checks `page.layout.slots`.
    // aiAutoDesign returns pages with `layout` (string) and `slots` (array).
    // It seems aiAutoDesign produces a simplified structure:
    // { layout: "two-horizontal", slots: [...] }
    // The frontend expects `page.layout.slots`?
    // Wait, line 295: `if (!page.photos && page.layout && page.layout.slots)`
    // Line 302: `page.layout.slots.forEach`
    // So frontend expects `page` object to have `layout` property which is an OBJECT containing `slots`.
    // But `aiAutoDesign` returns `page` with `layout` as STRING (e.g., "two-horizontal")
    // and `slots` as a sibling array.

    // We need to adapt the structure here.
    /* eslint-disable max-len */
    const LAYOUTS = {
      "single": [{"x": 10, "y": 10, "width": 80, "height": 80}],
      "two-vertical": [{"x": 10, "y": 5, "width": 80, "height": 43}, {"x": 10, "y": 52, "width": 80, "height": 43}],
      "two-horizontal": [{"x": 5, "y": 15, "width": 43, "height": 70}, {"x": 52, "y": 15, "width": 43, "height": 70}],
      "three-left": [{"x": 5, "y": 5, "width": 55, "height": 90}, {"x": 63, "y": 5, "width": 32, "height": 43}, {"x": 63, "y": 52, "width": 32, "height": 43}],
      "three-right": [{"x": 10, "y": 5, "width": 80, "height": 50}, {"x": 10, "y": 58, "width": 38, "height": 37}, {"x": 52, "y": 58, "width": 38, "height": 37}],
      "four-grid": [{"x": 5, "y": 5, "width": 43, "height": 43}, {"x": 52, "y": 5, "width": 43, "height": 43}, {"x": 5, "y": 52, "width": 43, "height": 43}, {"x": 52, "y": 52, "width": 43, "height": 43}],
      "collage-5": [{"x": 5, "y": 5, "width": 43, "height": 43}, {"x": 52, "y": 5, "width": 43, "height": 43}, {"x": 5, "y": 52, "width": 43, "height": 43}, {"x": 52, "y": 52, "width": 20, "height": 20}, {"x": 75, "y": 52, "width": 20, "height": 20}],
      "collage-6": [{"x": 5, "y": 5, "width": 30, "height": 40}, {"x": 38, "y": 5, "width": 24, "height": 40}, {"x": 65, "y": 5, "width": 30, "height": 40}, {"x": 5, "y": 50, "width": 30, "height": 40}, {"x": 38, "y": 50, "width": 24, "height": 40}, {"x": 65, "y": 50, "width": 30, "height": 40}],
    };

    const adaptedPages = result.plan.pages.map((p) => {
      const layoutMetrics = LAYOUTS[p.layout] || LAYOUTS["single"];
      const photoSlots = [];
      const textElements = [];

      p.slots.forEach((s) => {
        if (s.type === "photo") {
          const metrics = layoutMetrics[photoSlots.length] || layoutMetrics[0] || {x: 0, y: 0, width: 100, height: 100};
          photoSlots.push({
            ...s,
            photoId: photos[s.photoIndex] ? photos[s.photoIndex].id : undefined,
            x: metrics.x,
            y: metrics.y,
            width: metrics.width,
            height: metrics.height,
            shape: s.shape || "rect",
          });
        } else if (s.type === "text") {
          textElements.push({
            id: `text_${Math.random().toString(36).substr(2, 9)}`,
            type: "text",
            content: s.content,
            styleId: s.styleId,
            fontSize: s.fontSize,
            x: 10,
            y: 85, // Generic bottom position
            width: 80,
            transform: `rotate(${s.rotation || 0}deg)`,
            zIndex: 10,
          });
        }
      });

      return {
        id: `page_${Math.random().toString(36).substr(2, 9)}`,
        templateId: "magic-page-v4",
        layout: {
          id: p.layout,
          slots: photoSlots,
        },
        elements: textElements,
        background: p.backgroundTextureId || undefined,
        backgroundTextureId: p.backgroundTextureId || undefined,
        elementCategories: p.elementCategories || [],
        fontId: p.fontId || undefined,
        decorations: [],
      };
    });

    // Add cover as first page?
    // Frontend handles cover separately via `result.pages` iteration where `templateId === 'cover'`.
    const coverPage = {
      id: "page_cover_" + Math.random().toString(36).substr(2, 9),
      templateId: "cover",
      layout: result.plan.cover.photoShape === "rect" ? "full-bleed" : "standard",
      title: result.plan.cover.title || "My Photo Book",
      subtitle: result.plan.cover.subtitle || "",
      spineText: result.plan.cover.title || "My Photo Book",
      frontPhotoId: photos[result.plan.cover.photoIndex] ? photos[result.plan.cover.photoIndex].id : null,
      backPhotoId: null,
      theme: result.plan.cover.backgroundTextureId || result.plan.templateId || "classic",
      textColor: "#000000",
      background: result.plan.cover.backgroundTextureId || "classic",
    };

    // Build back cover from AI plan
    const backCoverPage = {
      id: "page_backcover_" + Math.random().toString(36).substr(2, 9),
      templateId: "back-cover",
      title: result.plan.backCover?.text || "Thank you for viewing",
      subtitle: result.plan.backCover?.subtitle || "",
      background: result.plan.backCover?.backgroundTextureId || result.plan.cover.backgroundTextureId || "classic",
    };

    // Prepend cover and append back cover to pages
    adaptedPages.unshift(coverPage);
    adaptedPages.push(backCoverPage);

    res.json({
      pages: adaptedPages,
      cover: result.plan.cover,
      backCover: result.plan.backCover,
      theme: {
        id: result.plan.templateId,
        coverId: result.plan.cover.backgroundTextureId,
      },
    });
  } catch (error) {
    console.error("Create Error:", error);
    res.status(500).json({error: error.message});
  }
});


module.exports = app;
