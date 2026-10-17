import Document from '../models/Document.js';

/**
 * @desc    Get user's medical document timeline sorted chronologically
 * @route   GET /api/timeline
 * @access  Private
 */
export const getTimeline = async (req, res) => {
  try {
    const { documentType, startDate, endDate } = req.query;

    // Strict user isolation filter
    const filter = { userId: req.user._id };

    // Apply document type filter if specified and not 'All'
    if (documentType && documentType !== 'All') {
      filter.documentType = documentType;
    }

    // Apply date range filter if specified
    if (startDate || endDate) {
      filter.documentDate = {};
      if (startDate) {
        filter.documentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of the day for inclusive filtering
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.documentDate.$lte = end;
      }
    }

    // Fetch user documents sorted by documentDate descending, fallback to uploadedAt descending
    const documents = await Document.find(filter)
      .select('_id originalName documentType documentDate uploadedAt fileSize mimeType ocrUsed extractionStatus chunkCount')
      .sort({ documentDate: -1, uploadedAt: -1 });

    const timeline = documents.map((doc) => ({
      documentId: doc._id,
      originalName: doc.originalName,
      documentType: doc.documentType,
      documentDate: doc.documentDate,
      uploadedAt: doc.uploadedAt,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      ocrUsed: doc.ocrUsed,
      extractionStatus: doc.extractionStatus,
      chunkCount: doc.chunkCount,
    }));

    res.status(200).json({
      success: true,
      count: timeline.length,
      timeline,
    });
  } catch (error) {
    console.error('Timeline Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching medical timeline',
    });
  }
};
