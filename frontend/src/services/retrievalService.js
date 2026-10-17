import api from './api';

/**
 * Perform semantic search retrieval for relevant document chunks
 * @param {Object} params
 * @param {string} params.query User question/search query
 * @param {string} [params.documentId] Optional Document ID filter
 * @param {number} [params.topK=5] Number of top matches to retrieve
 */
export const searchRelevantChunks = async ({ query, documentId, topK = 5 }) => {
  const response = await api.post('/retrieval/search', {
    query,
    documentId,
    topK,
  });
  return response.data;
};
