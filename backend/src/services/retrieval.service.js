import DocumentChunk from '../models/DocumentChunk.js';
import { generateEmbedding } from './embedding.service.js';
import { getPineconeClient } from '../config/pinecone.js';

/**
 * RAG Semantic Retrieval Service
 * Converts user query to embedding, searches Pinecone with metadata filtering,
 * applies similarity threshold, and fetches original text chunks from MongoDB.
 *
 * @param {Object} params
 * @param {string} params.query User question/search query
 * @param {string} params.userId Authenticated User ID
 * @param {string} [params.documentId] Optional Document ID to scope retrieval
 * @param {number} [params.topK=5] Maximum number of relevant chunks to retrieve
 * @returns {Promise<Array<{ chunkId: string, documentId: string, pageNumber: number, chunkIndex: number, score: number, text: string }>>}
 */
export const retrieveRelevantChunks = async ({ query, userId, documentId, topK = 5 }) => {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Query string is required for semantic retrieval');
  }

  if (!userId) {
    throw new Error('User ID is required for user-isolated retrieval');
  }

  console.log(`[Retrieval Service] Query received: "${query.trim()}" (userId: ${userId}, documentId: ${documentId || 'ALL'})`);

  // 1. Generate Query Vector Embedding via Gemini API
  const queryEmbedding = await generateEmbedding(query.trim());
  console.log(`[Retrieval Service] Query vector generated (${queryEmbedding.length} dimensions)`);

  // 2. Initialize Pinecone Client
  const pc = getPineconeClient();
  if (!pc) {
    throw new Error('PINECONE_API_KEY is not configured in backend environment variables');
  }

  const indexName = process.env.PINECONE_INDEX_NAME || 'healthvault';
  const index = pc.index(indexName);

  // 3. Build Metadata Filter for User Isolation & Optional Document Scoping
  const filter = {
    userId: userId.toString(),
  };

  if (documentId) {
    filter.documentId = documentId.toString();
  }

  // 4. Query Pinecone Similarity Search
  const searchResponse = await index.query({
    vector: queryEmbedding,
    topK: Math.min(Math.max(topK, 1), 20),
    filter,
    includeMetadata: true,
  });

  const rawMatches = searchResponse.matches || [];
  console.log(`[Retrieval Service] Pinecone matches found: ${rawMatches.length}`);

  // 5. Apply Configurable Similarity Score Threshold
  const minScoreThreshold = parseFloat(process.env.RAG_MIN_SIMILARITY_SCORE || '0.3');
  const validMatches = rawMatches.filter((match) => match.score >= minScoreThreshold);

  console.log(`[Retrieval Service] Matches passing score threshold (>= ${minScoreThreshold}): ${validMatches.length}`);

  if (validMatches.length === 0) {
    return [];
  }

  // 6. Extract Chunk Object IDs and Query MongoDB (Dual-Layer User Isolation)
  const chunkIds = validMatches.map((match) => match.id);

  const mongoChunks = await DocumentChunk.find({
    _id: { $in: chunkIds },
    userId: userId,
  });

  const chunkMap = new Map();
  mongoChunks.forEach((c) => chunkMap.set(c._id.toString(), c));

  // 7. Format & Return Results maintaining exact relevance order
  const results = [];
  for (const match of validMatches) {
    const chunkDoc = chunkMap.get(match.id);

    if (chunkDoc) {
      results.push({
        chunkId: chunkDoc._id.toString(),
        documentId: chunkDoc.documentId.toString(),
        pageNumber: chunkDoc.pageNumber,
        chunkIndex: chunkDoc.chunkIndex,
        score: parseFloat(match.score.toFixed(4)),
        text: chunkDoc.text,
      });
    } else {
      console.warn(`[Retrieval Service] Chunk ID ${match.id} matched in Pinecone but not found in MongoDB`);
    }
  }

  console.log(`[Retrieval Service] Successfully returned ${results.length} relevant chunks`);
  return results;
};
