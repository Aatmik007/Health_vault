import path from 'path';
import fs from 'fs';
import Document, { DOCUMENT_TYPES } from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';
import {
  createDocumentRecord,
  fetchUserDocuments,
  fetchUserDocumentById,
  deleteUserDocumentRecord,
  fetchUserMetrics,
} from '../services/documentService.js';
import { extractTextFromDocument } from '../services/documentExtraction.service.js';
import { chunkDocument } from '../services/documentChunking.service.js';
import { generateDocumentEmbeddings } from '../services/documentEmbedding.service.js';
import { upsertDocumentChunks, deleteDocumentVectors } from '../services/vectorDatabase.service.js';
import { compareDocuments } from '../services/documentComparison.service.js';

/**
 * Helper to execute full 4-stage pipeline sequentially:
 * Extraction -> Chunking -> Embeddings -> Pinecone Vector Sync
 */
const runExtractionPipeline = async (documentId, filePath, mimeType) => {
  try {
    // Stage 1: Extraction & OCR Fallback
    await Document.findByIdAndUpdate(documentId, {
      extractionStatus: 'processing',
      ocrStatus: mimeType.startsWith('image/') ? 'processing' : 'pending',
      extractionError: null,
      ocrError: null,
    });

    const extractionResult = await extractTextFromDocument(filePath, mimeType);
    const { extractedPages, ocrUsed, ocrStatus, ocrError } = extractionResult;

    const isExtractionSuccess = ocrStatus !== 'failed' || (extractedPages && extractedPages.length > 0);

    const updatedDoc = await Document.findByIdAndUpdate(
      documentId,
      {
        extractionStatus: isExtractionSuccess ? 'completed' : 'failed',
        extractedText: extractedPages || [],
        extractedAt: new Date(),
        ocrUsed: ocrUsed || false,
        ocrStatus: ocrStatus || 'not_required',
        ocrError: ocrError || null,
        ocrCompletedAt: ocrUsed ? new Date() : null,
      },
      { new: true }
    );

    // Stage 2: Chunking
    if (updatedDoc) {
      const chunkingSuccess = await chunkDocument(updatedDoc);
      
      // Stage 3: Embedding
      if (chunkingSuccess && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        const embeddingSuccess = await generateDocumentEmbeddings(updatedDoc._id, updatedDoc.userId);

        // Stage 4: Pinecone Vector Sync
        if (embeddingSuccess && process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== 'your_pinecone_api_key_here') {
          await upsertDocumentChunks(updatedDoc._id, updatedDoc.userId);
        }
      }
    }
  } catch (error) {
    console.error(`Pipeline Error for document ${documentId}:`, error);
    await Document.findByIdAndUpdate(documentId, {
      extractionStatus: 'failed',
      extractionError: 'Failed to process document through pipeline.',
      chunkingStatus: 'failed',
      embeddingStatus: 'failed',
      vectorStatus: 'failed',
    });
  }
};

/**
 * @desc    Upload new medical document & trigger full 4-stage pipeline
 * @route   POST /api/documents
 * @access  Private
 */
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded or file format invalid' });
    }

    const { documentType, documentDate } = req.body;

    if (!documentType || !DOCUMENT_TYPES.includes(documentType)) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: `Invalid document type. Allowed types: ${DOCUMENT_TYPES.join(', ')}`,
      });
    }

    const docData = {
      userId: req.user._id,
      originalName: req.file.originalname,
      storedFileName: req.file.filename,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      documentType,
      documentDate: documentDate ? new Date(documentDate) : new Date(),
      extractionStatus: 'pending',
      chunkingStatus: 'pending',
      embeddingStatus: 'pending',
      vectorStatus: 'pending',
    };

    const document = await createDocumentRecord(docData);

    // Trigger sequential processing pipeline
    await runExtractionPipeline(document._id, document.filePath, document.mimeType);

    const updatedDocument = await Document.findById(document._id);

    return res.status(201).json({
      success: true,
      message: 'Document uploaded and processed through 4-stage pipeline',
      document: updatedDocument,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, message: 'Server error during document upload' });
  }
};

/**
 * @desc    Get user documents with search, filter, and sort
 * @route   GET /api/documents
 * @access  Private
 */
export const getDocuments = async (req, res) => {
  try {
    const { search, documentType, sort } = req.query;
    const documents = await fetchUserDocuments(req.user._id, { search, documentType, sort });

    return res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error('Get Documents Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching documents' });
  }
};

/**
 * @desc    Get metrics for dashboard
 * @route   GET /api/documents/metrics
 * @access  Private
 */
export const getDocumentMetrics = async (req, res) => {
  try {
    const metrics = await fetchUserMetrics(req.user._id);
    return res.status(200).json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Get Metrics Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching document metrics' });
  }
};

/**
 * @desc    Get single document metadata & status
 * @route   GET /api/documents/:id
 * @access  Private
 */
export const getDocumentById = async (req, res) => {
  try {
    const document = await fetchUserDocumentById(req.params.id, req.user._id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
    }

    return res.status(200).json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Get Document By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching document details' });
  }
};

/**
 * @desc    Get document chunks for development/inspection
 * @route   GET /api/documents/:id/chunks
 * @access  Private
 */
export const getDocumentChunks = async (req, res) => {
  try {
    const document = await fetchUserDocumentById(req.params.id, req.user._id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
    }

    const rawChunks = await DocumentChunk.find({
      documentId: req.params.id,
      userId: req.user._id,
    }).sort({ chunkIndex: 1 });

    const chunks = rawChunks.map((c) => ({
      _id: c._id,
      documentId: c.documentId,
      userId: c.userId,
      chunkIndex: c.chunkIndex,
      pageNumber: c.pageNumber,
      text: c.text,
      characterCount: c.characterCount,
      embeddingStatus: c.embeddingStatus,
      embeddingDimensions: c.embedding ? c.embedding.length : 0,
      vectorStatus: c.vectorStatus,
      vectorSyncedAt: c.vectorSyncedAt,
    }));

    return res.status(200).json({
      success: true,
      documentId: document._id,
      chunkCount: chunks.length,
      chunks,
    });
  } catch (error) {
    console.error('Get Document Chunks Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching document chunks' });
  }
};

/**
 * @desc    Get single document chunk details
 * @route   GET /api/documents/:documentId/chunks/:chunkId
 * @access  Private
 */
export const getSingleDocumentChunk = async (req, res) => {
  try {
    const { documentId, chunkId } = req.params;

    const document = await fetchUserDocumentById(documentId, req.user._id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
    }

    const chunk = await DocumentChunk.findOne({
      _id: chunkId,
      documentId,
      userId: req.user._id,
    });

    if (!chunk) {
      return res.status(404).json({ success: false, message: 'Document chunk not found or unauthorized' });
    }

    return res.status(200).json({
      success: true,
      chunk: {
        _id: chunk._id,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
        text: chunk.text,
        characterCount: chunk.characterCount,
      },
    });
  } catch (error) {
    console.error('Get Single Chunk Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching document chunk' });
  }
};

/**
 * @desc    Trigger/Regenerate Gemini embeddings for document chunks
 * @route   POST /api/documents/:id/embed
 * @access  Private
 */
export const triggerDocumentEmbedding = async (req, res) => {
  try {
    const document = await fetchUserDocumentById(req.params.id, req.user._id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.status(400).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured in backend .env file. Please add a valid key.',
      });
    }

    const success = await generateDocumentEmbeddings(document._id, req.user._id);
    const updatedDoc = await Document.findById(document._id);

    if (success) {
      return res.status(200).json({
        success: true,
        message: 'Document embeddings generated successfully',
        embeddedChunkCount: updatedDoc.embeddedChunkCount,
        embeddingStatus: updatedDoc.embeddingStatus,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: updatedDoc.embeddingError || 'Failed to generate document embeddings',
        embeddingStatus: updatedDoc.embeddingStatus,
      });
    }
  } catch (error) {
    console.error('Trigger Embedding Error:', error);
    return res.status(500).json({ success: false, message: 'Server error generating document embeddings' });
  }
};

/**
 * @desc    Trigger Pinecone vector sync manually for document
 * @route   POST /api/documents/:id/vector-sync
 * @access  Private
 */
export const triggerVectorSync = async (req, res) => {
  try {
    const document = await fetchUserDocumentById(req.params.id, req.user._id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
    }

    if (!process.env.PINECONE_API_KEY || process.env.PINECONE_API_KEY === 'your_pinecone_api_key_here') {
      return res.status(400).json({
        success: false,
        message: 'PINECONE_API_KEY is not configured in backend .env file. Please add a valid key.',
      });
    }

    const success = await upsertDocumentChunks(document._id, req.user._id);
    const updatedDoc = await Document.findById(document._id);

    if (success) {
      return res.status(200).json({
        success: true,
        message: 'Document vectors synchronized to Pinecone successfully',
        vectorCount: updatedDoc.vectorCount,
        vectorStatus: updatedDoc.vectorStatus,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: updatedDoc.vectorSyncError || 'Failed to sync vectors to Pinecone',
        vectorStatus: updatedDoc.vectorStatus,
      });
    }
  } catch (error) {
    console.error('Trigger Vector Sync Error:', error);
    return res.status(500).json({ success: false, message: 'Server error syncing vectors to Pinecone' });
  }
};

/**
 * @desc    Get vector processing status summary for development/inspection
 * @route   GET /api/documents/:id/vector-status
 * @access  Private
 */
export const getVectorStatus = async (req, res) => {
  try {
    const document = await fetchUserDocumentById(req.params.id, req.user._id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
    }

    return res.status(200).json({
      success: true,
      documentId: document._id,
      chunkCount: document.chunkCount || 0,
      embeddedChunkCount: document.embeddedChunkCount || 0,
      vectorCount: document.vectorCount || 0,
      vectorStatus: document.vectorStatus || 'pending',
    });
  } catch (error) {
    console.error('Get Vector Status Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching vector status' });
  }
};

/**
 * @desc    Delete document, physical file, chunks, and Pinecone vectors
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
export const deleteDocument = async (req, res) => {
  try {
    const document = await fetchUserDocumentById(req.params.id, req.user._id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
    }

    // 1. Delete corresponding Pinecone vectors
    await deleteDocumentVectors(req.params.id);

    // 2. Delete MongoDB document record and physical file
    await deleteUserDocumentRecord(req.params.id, req.user._id);

    // 3. Delete MongoDB chunks
    await DocumentChunk.deleteMany({ documentId: req.params.id, userId: req.user._id });

    return res.status(200).json({
      success: true,
      message: 'Document, physical file, chunks, and Pinecone vectors deleted successfully',
    });
  } catch (error) {
    console.error('Delete Document Error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting document' });
  }
};

/**
 * @desc    View/download document file
 * @route   GET /api/documents/:id/file
 * @access  Private
 */
export const getDocumentFile = async (req, res) => {
  try {
    const document = await fetchUserDocumentById(req.params.id, req.user._id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
    }

    const absolutePath = path.resolve(document.filePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'Physical file not found on server storage' });
    }

    res.setHeader('Content-Type', document.mimeType);
    const download = req.query.download === 'true';
    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    }

    return res.sendFile(absolutePath);
  } catch (error) {
    console.error('Stream File Error:', error);
    return res.status(500).json({ success: false, message: 'Server error serving document file' });
  }
};

/**
 * @desc    Compare two authorized user documents side-by-side
 * @route   POST /api/documents/compare
 * @access  Private
 */
export const handleCompareDocuments = async (req, res) => {
  try {
    const { documentIdA, documentIdB } = req.body;

    if (!documentIdA || !documentIdB) {
      return res.status(400).json({
        success: false,
        message: 'Please select both Document A and Document B to compare.',
      });
    }

    if (documentIdA === documentIdB) {
      return res.status(400).json({
        success: false,
        message: 'Please select two different documents. Cannot compare a document with itself.',
      });
    }

    // Strict user isolation check
    const docA = await Document.findOne({ _id: documentIdA, userId: req.user._id });
    const docB = await Document.findOne({ _id: documentIdB, userId: req.user._id });

    if (!docA || !docB) {
      return res.status(404).json({
        success: false,
        message: 'One or both medical documents were not found or access is unauthorized.',
      });
    }

    const comparisonResult = compareDocuments(docA, docB);

    return res.status(200).json({
      success: true,
      ...comparisonResult,
    });
  } catch (error) {
    console.error('Compare Documents Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error comparing medical documents.',
    });
  }
};

