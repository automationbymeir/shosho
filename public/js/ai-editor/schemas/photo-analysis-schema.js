/**
 * Schema for Photo Analysis Result
 * Defines the structure expected from Gemini's vision analysis.
 */

export const PhotoAnalysisSchema = {
    type: "object",
    required: ["description", "subjects", "mood", "dominantColors", "composition"],
    properties: {
        description: { type: "string", description: "1-2 sentence description of the scene" },
        subjects: { type: "array", items: { type: "string" }, description: "List of detected subjects" },
        people: {
            type: "object",
            properties: {
                count: { type: "number" },
                expressions: { type: "array", items: { type: "string" } },
                activities: { type: "array", items: { type: "string" } }
            }
        },
        location: {
            type: "object",
            properties: {
                type: { type: "string", enum: ["indoor", "outdoor", "unknown"] },
                setting: { type: "string" },
                timeOfDay: { type: "string" }
            }
        },
        mood: { type: "array", items: { type: "string" } },
        dominantColors: { type: "array", items: { type: "string", pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" } },
        composition: {
            type: "object",
            properties: {
                orientation: { type: "string", enum: ["landscape", "portrait", "square"] },
                quality: { type: "string", enum: ["high", "medium", "low"] },
                focusPoint: {
                    type: "object",
                    properties: { x: { type: "number" }, y: { type: "number" } }
                }
            }
        },
        suggestedCaption: { type: "string" },
        importance: { type: "string", enum: ["hero", "supporting", "filler"] }
    }
};

/**
 * Validate an object against the schema (Simple recursive validator)
 * @param {Object} obj 
 * @returns {boolean}
 */
export function validatePhotoAnalysis(obj) {
    // Basic structural check only for runtime safety
    return obj &&
        typeof obj.description === 'string' &&
        Array.isArray(obj.subjects) &&
        Array.isArray(obj.dominantColors);
}
