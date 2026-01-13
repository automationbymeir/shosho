/**
 * Schema for Page Design
 * Defines the comprehensive layout and content for a single page.
 */

export const PageSchema = {
    type: "object",
    required: ["pageId", "layout", "background"],
    properties: {
        pageId: { type: "string" },
        pageType: { type: "string", enum: ["cover", "chapter-start", "collage", "single-hero", "standard"] },
        chapterId: { type: "string" },

        background: {
            type: "object",
            required: ["type"],
            properties: {
                type: { type: "string", enum: ["generated", "solid", "gradient", "image"] },
                imagePrompt: { type: "string" },
                imageUrl: { type: "string" },
                fallbackColor: { type: "string" }
            }
        },

        layout: {
            type: "object",
            properties: {
                gridType: { type: "string" },
                photoSlots: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            slotId: { type: "string" },
                            photoIndex: { type: "number" },
                            position: {
                                type: "object",
                                properties: { x: { type: "number" }, y: { type: "number" } }
                            },
                            size: {
                                type: "object",
                                properties: { width: { type: "number" }, height: { type: "number" } }
                            },
                            rotation: { type: "number" },
                            zIndex: { type: "number" },
                            frame: {
                                type: "object",
                                properties: {
                                    type: { type: "string" },
                                    color: { type: "string" },
                                    shadow: { type: "boolean" }
                                }
                            }
                        }
                    }
                }
            }
        },

        textElements: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    type: { type: "string", enum: ["title", "subtitle", "caption", "quote"] },
                    content: { type: "string" },
                    position: {
                        type: "object",
                        properties: { x: { type: "number" }, y: { type: "number" } }
                    },
                    style: {
                        type: "object",
                        properties: {
                            fontFamily: { type: "string" },
                            fontSize: { type: "number" },
                            color: { type: "string" },
                            textAlign: { type: "string" }
                        }
                    }
                }
            }
        },

        decorativeElements: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    type: { type: "string" },
                    shape: { type: "string" },
                    color: { type: "string" }
                }
            }
        }
    }
};

export function validatePage(obj) {
    return obj &&
        obj.background &&
        obj.layout &&
        Array.isArray(obj.layout.photoSlots);
}
