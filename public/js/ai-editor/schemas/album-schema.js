/**
 * Schema for Album Structure
 * Defines the high-level plan for the album.
 */

export const AlbumSchema = {
    type: "object",
    required: ["albumId", "meta", "designSystem", "chapters", "pages"],
    properties: {
        albumId: { type: "string" },
        meta: {
            type: "object",
            required: ["title", "totalPages"],
            properties: {
                title: { type: "string" },
                subtitle: { type: "string" },
                narrative: { type: "string" },
                totalPages: { type: "number" },
                aspectRatio: { type: "string" }
            }
        },
        designSystem: {
            type: "object",
            properties: {
                primaryColor: { type: "string" },
                secondaryColor: { type: "string" },
                accentColor: { type: "string" },
                fontFamily: {
                    type: "object",
                    properties: {
                        heading: { type: "string" },
                        body: { type: "string" },
                        accent: { type: "string" }
                    }
                },
                mood: { type: "string" },
                styleKeywords: { type: "array", items: { type: "string" } }
            }
        },
        chapters: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    pageRange: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }
                }
            }
        },
        pages: {
            type: "array",
            description: "List of page designs"
        }
    }
};

export function validateAlbum(obj) {
    return obj &&
        obj.meta &&
        typeof obj.meta.title === 'string' &&
        obj.designSystem &&
        Array.isArray(obj.chapters);
}
