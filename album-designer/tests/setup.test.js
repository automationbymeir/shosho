// tests/setup.test.js
const { ai, MODELS } = require('../src/config/gemini');

async function testConnection() {
    console.log("Testing connection with model:", MODELS.FAST);
    try {
        const response = await ai.models.generateContent({
            model: MODELS.FAST,
            contents: "Say 'Album Designer Ready' if you can hear me.",
        });
        // Adjust parsing based on actual response structure of new SDK
        const text = response.text || (response.candidates && response.candidates[0].content.parts[0].text);
        console.log("✅ Connection test passed:", text);
        return true;
    } catch (error) {
        console.error("❌ Connection test failed:", error);
        if (error.response) console.error("Response:", JSON.stringify(error.response, null, 2));
        return false;
    }
}

testConnection();
