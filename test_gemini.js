require('dotenv').config({ path: '/Users/keshavgoyal/Documents/Freelance/Vibe2Ship/LasMinAI/backend/.env' });
const { GoogleGenAI, Type, Schema } = require('@google/genai');
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
