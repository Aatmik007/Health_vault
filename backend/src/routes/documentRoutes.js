import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { validateObjectId, validateCompareInput } from '../middleware/validationMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiterMiddleware.js';
import {
  uploadDocument,
  getDocuments,
  getDocumentMetrics,
  getDocumentById,
  getDocumentChunks,
  getSingleDocumentChunk,
  triggerDocumentEmbedding,
  triggerVectorSync,
  getVectorStatus,
  deleteDocument,
  getDocumentFile,
  handleCompareDocuments,
} from '../controllers/documentController.js';

const router = express.Router();

// All routes require JWT authentication
router.use(protect);
router.use(apiLimiter);

router.post('/compare', validateCompareInput, handleCompareDocuments);
router.post('/', upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.get('/metrics', getDocumentMetrics);
router.get('/:id', validateObjectId('id'), getDocumentById);
router.get('/:id/chunks', validateObjectId('id'), getDocumentChunks);
router.get('/:documentId/chunks/:chunkId', validateObjectId(['documentId', 'chunkId']), getSingleDocumentChunk);
router.get('/:id/vector-status', validateObjectId('id'), getVectorStatus);
router.post('/:id/embed', validateObjectId('id'), triggerDocumentEmbedding);
router.post('/:id/vector-sync', validateObjectId('id'), triggerVectorSync);
router.delete('/:id', validateObjectId('id'), deleteDocument);
router.get('/:id/file', validateObjectId('id'), getDocumentFile);

export default router;
