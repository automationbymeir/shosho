/**
 * AI Story Detection and Caption Generation
 * Uses OpenAI GPT-4o-mini for analyzing photo metadata
 */

const OpenAI = require("openai");

/**
 * Initialize OpenAI client.
 * @return {OpenAI} OpenAI client instance.
 */
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
        "OPENAI_API_KEY not configured. Add it to Firebase secrets or functions/.env for local development.",
    );
  }
  return new OpenAI({apiKey});
}

// Icon mapping for locations/themes
const LOCATION_ICONS = {
  // Cities & Landmarks
  "rome": "landmark",
  "paris": "landmark",
  "london": "landmark",
  "berlin": "landmark",
  "new york": "landmark",
  "tokyo": "landmark",
  "barcelona": "landmark",
  "amsterdam": "landmark",
  "venice": "landmark",
  "prague": "landmark",
  "vienna": "landmark",
  "athens": "landmark",
  "jerusalem": "landmark",
  "tel aviv": "landmark",
  "dubai": "landmark",
  "singapore": "landmark",

  // Nature - Water
  "beach": "waves",
  "ocean": "waves",
  "coast": "waves",
  "sea": "waves",
  "lake": "waves",
  "pool": "waves",
  "river": "waves",
  "cruise": "waves",
  "sailing": "waves",
  "island": "waves",

  // Nature - Mountains
  "mountain": "mountain",
  "forest": "mountain",
  "hiking": "mountain",
  "alps": "mountain",
  "trail": "mountain",
  "camping": "mountain",
  "ski": "mountain",
  "snow": "mountain",

  // Wine & Food regions
  "tuscany": "wine",
  "napa": "wine",
  "bordeaux": "wine",
  "vineyard": "wine",
  "winery": "wine",
  "tasting": "wine",
  "champagne": "wine",

  // Events
  "wedding": "heart",
  "anniversary": "heart",
  "engagement": "heart",
  "honeymoon": "heart",
  "birthday": "cake",
  "party": "camera",
  "graduation": "camera",
  "celebration": "camera",

  // Travel
  "airport": "plane",
  "flight": "plane",
  "trip": "plane",
  "vacation": "plane",
  "travel": "plane",

  // Home & Family
  "home": "home",
  "house": "home",
  "family": "users",
  "reunion": "users",
  "thanksgiving": "home",
  "christmas": "tree",
  "holiday": "tree",

  // Default
  "default": "sun",
};

// Color palette for chapters (earthy, elegant tones)
const CHAPTER_COLORS = [
  "#E07B54", // Terracotta
  "#9CAF88", // Sage green
  "#5B9BD5", // Ocean blue
  "#D4A574", // Warm sand
  "#8B6F4E", // Coffee brown
  "#6B8E9F", // Steel blue
  "#C4956A", // Camel
  "#722F37", // Wine red
  "#2E86AB", // Deep teal
  "#F4D35E", // Golden yellow
];

/**
 * Extract date from photo metadata (multiple format support)
 * @param {Object} photo - Photo object
 * @return {string|null} Date string (YYYY-MM-DD) or null
 */
function extractDate(photo) {
  // Direct date field
  if (photo?.date) {
    return String(photo.date).split("T")[0];
  }

  // Google Photos creationTime
  if (photo?.creationTime) {
    return String(photo.creationTime).split("T")[0];
  }

  // Nested mediaMetadata (Google Photos API format)
  if (photo?.mediaMetadata?.creationTime) {
    return String(photo.mediaMetadata.creationTime).split("T")[0];
  }

  // EXIF date formats
  if (photo?.exif?.DateTimeOriginal) {
    // Format: "2024:03:15 14:30:00" -> "2024-03-15"
    return String(photo.exif.DateTimeOriginal).split(" ")[0].replace(/:/g, "-");
  }

  return null;
}

/**
 * Get icon name based on location/theme keywords
 * @param {string} location - Location string to analyze
 * @return {string} Icon name
 */
function getIconForLocation(location) {
  if (!location) return "sun";

  const lower = String(location).toLowerCase();

  for (const [keyword, icon] of Object.entries(LOCATION_ICONS)) {
    if (lower.includes(keyword)) {
      return icon;
    }
  }

  return "sun";
}

/**
 * Format date string as chapter name
 * @param {string} dateStr - Date string
 * @return {string} Formatted date or "Memories"
 */
function formatDateAsChapterName(dateStr) {
  if (!dateStr || dateStr === "unknown") return "Memories";

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Memories";
  }
}

/**
 * Basic story detection without AI (fallback)
 * Groups photos by date
 * @param {Array} photos - Array of photo objects
 * @return {Object} Story structure
 */
function detectStoryBasic(photos) {
  console.log("Using basic story detection (no AI)");

  // Group by date
  const byDate = new Map();

  (photos || []).forEach((photo, index) => {
    const date = extractDate(photo) || "unknown";
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date).push({photo, index});
  });

  const chapters = [];
  let chapterIndex = 0;

  // Convert map to chapters array
  const sortedDates = Array.from(byDate.keys()).sort();

  for (const date of sortedDates) {
    const items = byDate.get(date);
    const chapterPhotos = items.map((i) => i.photo);
    const photoIndices = items.map((i) => i.index);

    // Try to get location from first photo
    const firstPhoto = chapterPhotos[0];
    const location = firstPhoto?.location || "";

    chapters.push({
      id: `chapter-${chapterIndex}`,
      name: location || formatDateAsChapterName(date),
      subtitle: location ? formatDateAsChapterName(date) : `${chapterPhotos.length} photos`,
      icon: getIconForLocation(location),
      color: CHAPTER_COLORS[chapterIndex % CHAPTER_COLORS.length],
      photos: chapterPhotos,
      photoCount: chapterPhotos.length,
      photoIndices: photoIndices,
    });

    chapterIndex++;
  }

  // Generate title
  let title = "My Photo Book";
  if (chapters.length === 1 && chapters[0].name !== "Memories") {
    title = chapters[0].name;
  } else if (chapters.length > 1) {
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    if (firstDate !== "unknown" && lastDate !== "unknown") {
      const year = String(firstDate).split("-")[0];
      title = `Memories of ${year}`;
    }
  }

  return {
    success: true,
    story: {
      title: title,
      totalPhotos: photos.length,
      chapters: chapters,
      aiGenerated: false,
    },
  };
}

/**
 * Detect story structure using OpenAI
 * Analyzes photo metadata to find narrative patterns
 * @param {Array} photos - Array of photo objects with metadata
 * @return {Promise<Object>} Detected story with chapters
 */
async function detectStoryWithAI(photos) {
  if (!photos || photos.length === 0) {
    return {success: false, error: "No photos to analyze"};
  }

  console.log(`Analyzing ${photos.length} photos with AI...`);

  // Extract metadata for AI analysis
  const photoMetadata = photos.map((photo, index) => ({
    index,
    date: extractDate(photo),
    location: photo.location || null,
    filename: photo.filename || photo.name || null,
    hasGPS: !!(photo.gpsData || photo.latitude),
  }));

  // Check if we have enough metadata for AI analysis
  const hasUsefulMetadata = photoMetadata.some((p) => p.date || p.location);

  if (!hasUsefulMetadata) {
    console.log("Insufficient metadata for AI analysis, using basic detection");
    return detectStoryBasic(photos);
  }

  try {
    const openai = getOpenAIClient();

    const prompt = `Analyze these ${photos.length} photos and detect a story structure for a printed photo book.

Photo metadata:
${JSON.stringify(photoMetadata, null, 2)}

Based on dates, locations, and patterns, identify:
1. An overall story title (e.g., "Italy Trip 2024", "Summer Memories", "Sarah's Wedding")
2. Logical chapters/sections (group photos by location, date ranges, or events)
3. For each chapter: name, subtitle (like "Days 1-3" or "The Ceremony"), and which photo indices belong to it

Rules:
- Keep chapter count between 1-6 for best book flow
- If photos span multiple days in one location, that's one chapter
- If photos are from different locations on the same trip, create separate chapters
- Group consecutive dates together unless there's a location change
- Make titles and chapter names elegant and suitable for a printed book

Respond in JSON format only (no markdown):
{
  "title": "Story Title",
  "chapters": [
    {
      "name": "Chapter Name",
      "subtitle": "Brief descriptor",
      "photoIndices": [0, 1, 2],
      "locationHint": "keyword for icon selection (e.g., beach, mountain, city, wedding)"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a photo book curator helping organize photos into a narrative structure. " +
            "Always respond with valid JSON only, no markdown formatting or code blocks.",
        },
        {role: "user", content: prompt},
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Empty response from OpenAI");
      return detectStoryBasic(photos);
    }

    console.log("AI Response:", content.substring(0, 200) + "...");

    // Parse AI response (handle potential markdown formatting)
    let aiResult;
    try {
      const cleanJson = content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
      aiResult = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError.message);
      console.error("Raw content:", content);
      return detectStoryBasic(photos);
    }

    // Validate AI result structure
    if (!aiResult.chapters || !Array.isArray(aiResult.chapters)) {
      console.error("Invalid AI result structure");
      return detectStoryBasic(photos);
    }

    // Convert AI result to our chapter format
    const chapters = aiResult.chapters
        .map((ch, index) => {
          const photoIndices = (ch.photoIndices || []).filter((i) => i >= 0 && i < photos.length);
          const chapterPhotos = photoIndices.map((i) => photos[i]);

          return {
            id: `chapter-${index}`,
            name: ch.name || `Chapter ${index + 1}`,
            subtitle: ch.subtitle || "",
            icon: getIconForLocation(ch.locationHint || ch.name),
            color: CHAPTER_COLORS[index % CHAPTER_COLORS.length],
            photos: chapterPhotos,
            photoCount: chapterPhotos.length,
            photoIndices: photoIndices,
          };
        })
        .filter((ch) => ch.photoCount > 0); // Remove empty chapters

    // Ensure all photos are assigned
    const assignedIndices = new Set(chapters.flatMap((ch) => ch.photoIndices));
    const unassignedIndices = photos
        .map((_, i) => i)
        .filter((i) => !assignedIndices.has(i));

    if (unassignedIndices.length > 0) {
      console.log(`${unassignedIndices.length} unassigned photos, adding to last chapter`);

      if (chapters.length > 0) {
        const lastChapter = chapters[chapters.length - 1];
        unassignedIndices.forEach((i) => {
          lastChapter.photoIndices.push(i);
          lastChapter.photos.push(photos[i]);
          lastChapter.photoCount++;
        });
      } else {
        // No chapters created, create one for unassigned
        chapters.push({
          id: "chapter-0",
          name: "Memories",
          subtitle: `${unassignedIndices.length} photos`,
          icon: "sun",
          color: CHAPTER_COLORS[0],
          photos: unassignedIndices.map((i) => photos[i]),
          photoCount: unassignedIndices.length,
          photoIndices: unassignedIndices,
        });
      }
    }

    console.log(`AI detected: "${aiResult.title}" with ${chapters.length} chapters`);

    return {
      success: true,
      story: {
        title: aiResult.title || "My Photo Book",
        totalPhotos: photos.length,
        chapters: chapters,
        aiGenerated: true,
      },
    };
  } catch (error) {
    console.error("AI story detection failed:", error);

    // OpenAI SDK uses status codes / message; keep it simple
    if (error?.code === "invalid_api_key") {
      return {success: false, error: "Invalid OpenAI API key"};
    }

    // Fall back to basic detection
    return detectStoryBasic(photos);
  }
}

/**
 * Generate captions for photos using AI
 * @param {Array} photos - Array of photo objects
 * @return {Promise<Object>} Result with captions array
 */
async function generateCaptionsWithAI(photos) {
  if (!photos || photos.length === 0) {
    return {success: false, error: "No photos to caption"};
  }

  console.log(`Generating captions for ${photos.length} photos...`);

  try {
    const openai = getOpenAIClient();

    const photoData = photos.map((photo, index) => ({
      index,
      date: extractDate(photo),
      location: photo.location || null,
      filename: photo.filename || photo.name || null,
      existingCaption: photo.caption || null,
    }));

    const prompt = `Generate short, elegant captions for these ${photos.length} photos in a printed photo book.

Photo data:
${JSON.stringify(photoData, null, 2)}

For each photo, create a caption that:
- Is 3-8 words long
- Captures the moment, mood, or location
- Sounds natural and evocative, not generic
- If location and date exist, incorporate them elegantly
- Skip photos that already have captions (existingCaption not null)

Respond with JSON array only (no markdown):
[
  { "index": 0, "caption": "Your caption here" },
  { "index": 1, "caption": "Another caption" }
]

Only include photos that need captions.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a photo book editor writing elegant, concise captions. Respond with JSON array only, no markdown.",
        },
        {role: "user", content: prompt},
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      return {success: false, error: "Empty response from AI"};
    }

    // Parse response
    const cleanJson = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

    const captions = JSON.parse(cleanJson);

    console.log(`Generated ${Array.isArray(captions) ? captions.length : 0} captions`);

    return {
      success: true,
      captions: captions,
    };
  } catch (error) {
    console.error("Caption generation failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  detectStoryWithAI,
  detectStoryBasic,
  generateCaptionsWithAI,
  extractDate,
  getIconForLocation,
  CHAPTER_COLORS,
  LOCATION_ICONS,
};


