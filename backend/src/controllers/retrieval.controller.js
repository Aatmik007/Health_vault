import { fetchUserDocumentById } from '../services/documentService.js';
import { retrieveRelevantChunks } from '../services/retrieval.service.js';

/**
 * @desc    Perform semantic RAG retrieval search for relevant document chunks
 * @route   POST /api/retrieval/search
 * @access  Private
 */
export const searchRelevantChunks = async (req, res) => {
  try {
    const { query, documentId, topK } = req.body;

    // 1. Validate Query Parameter
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid non-empty query string is required',
      });
    }

    if (query.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Query string exceeds maximum limit of 1000 characters',
      });
    }

    // 2. Validate Document Ownership if documentId is supplied
    if (documentId) {
      const document = await fetchUserDocumentById(documentId, req.user._id);
      if (!document) {
        return res.status(403).json({
          success: false,
          message: 'Document not found or unauthorized access to document',
        });
      }
    }

    // 3. Parse and Clamp topK
    const parsedTopK = topK ? parseInt(topK, 10) : 5;
    const clampedTopK = isNaN(parsedTopK) ? 5 : Math.min(Math.max(parsedTopK, 1), 20);

    // 4. Perform Retrieval
    const results = await retrieveRelevantChunks({
      query: query.trim(),
      userId: req.user._id,
      documentId,
      topK: clampedTopK,
    });

    return res.status(200).json({
      success: true,
      query: query.trim(),
      resultsCount: results.length,
      results,
    });
  } catch (error) {
    console.error('Retrieval Controller Error:', error.message);
    const statusCode = error.message.includes('not configured') ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error during semantic document retrieval',
    });
  }
};
