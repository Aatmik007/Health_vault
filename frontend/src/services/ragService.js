import api from './api';

/**
 * Send natural language medical document question to backend RAG pipeline
 * @param {Object} params
 * @param {string} params.question User question string
 * @param {string} [params.documentId] Optional Document ID filter
 * @param {number} [params.topK=5] Top chunks limit
 */
export const askQuestion = async ({ question, documentId, topK = 5 }) => {
  const response = await api.post('/rag/ask', {
    question,
    documentId,
    topK,
  });
  return response.data;
};
