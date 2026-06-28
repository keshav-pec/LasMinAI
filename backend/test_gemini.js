require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: "Hello" }] }]
    });
    console.log("Success:", response.text);
  } catch (err) {
    console.log("Error caught:", err.message);
  }
}
test();
