import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Low-level service to generate vector embeddings using Google's Gemini API
 * @param {string} text Text snippet to embed
 * @returns {Promise<number[]>} Array of floating point numbers representing the vector embedding
 */
export const generateEmbedding = async (text) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Text content is required for embedding generation');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in backend environment variables');
  }

  const modelName = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Explicitly set output dimensionality to 768 to match your Pinecone index
    const result = await model.embedContent({
      content: { parts: [{ text: text.trim() }] },
      outputDimensionality: 768,
    });
    
    const values = result.embedding?.values;

    if (!values || !Array.isArray(values) || values.length === 0) {
      throw new Error('Invalid or empty vector response received from Gemini Embedding API');
    }

    return values;
  } catch (error) {
    console.error('Gemini Embedding API Error:', error.message);
    throw new Error(`Embedding API failure: ${error.message}`);
  }
};