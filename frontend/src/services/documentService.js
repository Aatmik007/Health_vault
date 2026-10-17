import api from './api';

/**
 * Upload document with multipart/form-data
 */
export const uploadDocument = async (formData) => {
  const response = await api.post('/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get user documents list with search, filter, and sort options
 */
export const getDocuments = async ({ search = '', documentType = 'All', sort = 'newest' } = {}) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (documentType && documentType !== 'All') params.append('documentType', documentType);
  if (sort) params.append('sort', sort);

  const response = await api.get(`/documents?${params.toString()}`);
  return response.data;
};

/**
 * Get metrics for dashboard counts
 */
export const getDocumentMetrics = async () => {
  const response = await api.get('/documents/metrics');
  return response.data;
};

/**
 * Get single document metadata by ID
 */
export const getDocument = async (id) => {
  const response = await api.get(`/documents/${id}`);
  return response.data;
};

/**
 * Get document chunks for development/inspection
 */
export const getDocumentChunks = async (id) => {
  const response = await api.get(`/documents/${id}/chunks`);
  return response.data;
};

/**
 * Get single document chunk details
 */
export const getSingleDocumentChunk = async (documentId, chunkId) => {
  const response = await api.get(`/documents/${documentId}/chunks/${chunkId}`);
  return response.data;
};

/**
 * Manually trigger Gemini embedding generation for document
 */
export const triggerDocumentEmbedding = async (id) => {
  const response = await api.post(`/documents/${id}/embed`);
  return response.data;
};

/**
 * Manually trigger Pinecone vector sync for document
 */
export const triggerVectorSync = async (id) => {
  const response = await api.post(`/documents/${id}/vector-sync`);
  return response.data;
};

/**
 * Get vector status summary
 */
export const getVectorStatus = async (id) => {
  const response = await api.get(`/documents/${id}/vector-status`);
  return response.data;
};

/**
 * Delete document by ID
 */
export const deleteDocument = async (id) => {
  const response = await api.delete(`/documents/${id}`);
  return response.data;
};

/**
 * Get file view/download URL
 */
export const getDocumentFileUrl = (id, download = false) => {
  return `/api/documents/${id}/file${download ? '?download=true' : ''}`;
};

/**
 * Compare two documents side-by-side
 */
export const compareDocuments = async (documentIdA, documentIdB) => {
  const response = await api.post('/documents/compare', {
    documentIdA,
    documentIdB,
  });
  return response.data;
};