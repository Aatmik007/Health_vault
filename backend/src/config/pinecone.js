import { Pinecone } from '@pinecone-database/pinecone';

/**
 * Initializes and exports the Pinecone vector database client
 */
export const getPineconeClient = () => {
  const apiKey = process.env.PINECONE_API_KEY;

  if (!apiKey || apiKey === 'your_pinecone_api_key_here') {
    return null;
  }

  try {
    return new Pinecone({
      apiKey,
    });
  } catch (error) {
    console.error('Pinecone Initialization Error:', error.message);
    return null;
  }
};
