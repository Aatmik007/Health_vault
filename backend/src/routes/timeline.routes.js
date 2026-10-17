import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getTimeline } from '../controllers/timeline.controller.js';

const router = express.Router();

// Protected timeline route
router.get('/', protect, getTimeline);

export default router;
