const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

// Initialize the Gemini client using the key from your .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * A simple test function to verify Gemini is connected and responding.
 */
const testGeminiConnection = async () => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using Flash for rapid agentic routing
      contents: 'You are the core intelligence of LasMinAI, a proactive productivity agent. Reply with a short, energetic one-sentence greeting.',
    });
    
    return response.text;
  } catch (error) {
    console.error('❌ Gemini API Error:', error);
    throw new Error('Failed to connect to Gemini AI Studio');
  }
};

module.exports = {
  testGeminiConnection,
};