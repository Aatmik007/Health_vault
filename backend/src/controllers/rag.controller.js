import Document from '../models/Document.js';
import { retrieveRelevantChunks } from '../services/retrieval.service.js';
import { generateGroundedAnswer } from '../services/gemini.service.js';

/**
 * @desc    Execute RAG question-answering pipeline with rich source metadata
 * @route   POST /api/rag/ask
 * @access  Private
 */
export const askQuestion = async (req, res) => {
  try {
    const { question, documentId, topK } = req.body;

    // 1. Validate Question Parameter
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid non-empty question string is required',
      });
    }

    if (question.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Question exceeds maximum limit of 1000 characters',
      });
    }

    // 2. Validate Document Ownership if documentId is supplied
    if (documentId) {
      const document = await Document.findOne({ _id: documentId, userId: req.user._id });
      if (!document) {
        return res.status(403).json({
          success: false,
          message: 'Document not found or unauthorized access to document',
        });
      }
    }

    // 3. Retrieve Relevant Chunks via RAG Retrieval Service
    const retrievedChunks = await retrieveRelevantChunks({
      query: question.trim(),
      userId: req.user._id,
      documentId,
      topK: topK ? Math.min(Math.max(parseInt(topK, 10), 1), 20) : 5,
    });

    // 4. Fallback if no relevant context passes similarity threshold
    if (!retrievedChunks || retrievedChunks.length === 0) {
      return res.status(200).json({
        success: true,
        answer: "I couldn't find relevant information in your uploaded medical documents.",
        sources: [],
      });
    }

    // 5. Fetch Document metadata for rich source citation attributes
    const docIds = [...new Set(retrievedChunks.map((c) => c.documentId))];
    const documents = await Document.find({ _id: { $in: docIds }, userId: req.user._id })
      .select('_id originalName documentType documentDate');
      
    const docMap = new Map();
    documents.forEach((d) => docMap.set(d._id.toString(), d));

    // 6. Build Context String & Rich Source Citation Metadata
    const contextParts = [];
    const sources = [];

    retrievedChunks.forEach((chunk, index) => {
      const parentDoc = docMap.get(chunk.documentId);
      const docName = parentDoc?.originalName || 'Medical Document';
      const docType = parentDoc?.documentType || 'Document';
      const docDate = parentDoc?.documentDate || null;

      contextParts.push(
        `SOURCE ${index + 1}:\nDocument: ${docName}\nType: ${docType}\nPage: ${chunk.pageNumber}\n\n${chunk.text}`
      );

      sources.push({
        documentId: chunk.documentId,
        documentName: docName,
        documentType: docType,
        documentDate: docDate,
        pageNumber: chunk.pageNumber,
        chunkId: chunk.chunkId,
        chunkIndex: chunk.chunkIndex,
        score: chunk.score,
        text: chunk.text, // Chunk text for frontend preview
      });
    });

    const formattedContext = contextParts.join('\n\n---\n\n');

    // 7. Generate Grounded Answer using Gemini LLM
    const answer = await generateGroundedAnswer({
      question: question.trim(),
      context: formattedContext,
    });

    return res.status(200).json({
      success: true,
      answer,
      sources,
    });
  } catch (error) {
    console.error('RAG Controller Error:', error.message);
    const statusCode = error.message.includes('not configured') ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error during RAG question-answering process',
    });
  }
};
