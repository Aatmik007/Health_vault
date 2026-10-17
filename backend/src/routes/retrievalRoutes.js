import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { validateRagQueryInput } from '../middleware/validationMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiterMiddleware.js';
import { searchRelevantChunks } from '../controllers/retrieval.controller.js';

const router = express.Router();

// All routes require JWT authentication
router.use(protect);
router.use(apiLimiter);

router.post('/search', validateRagQueryInput, searchRelevantChunks);

export default router;
