import Document from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';

/**
 * CHUNKING PARAMETERS:
 * - Target Chunk Size: ~2400 characters (~600 tokens based on 1 token ≈ 4 chars)
 * - Target Overlap Size: ~400 characters (~100 tokens overlap)
 *
 * Page-aware chunking breaks large text into manageable chunks while preserving
 * page numbers for future RAG citations and maintaining contextual overlap between chunks.
 */
const CHUNK_SIZE = 2400;
const OVERLAP_SIZE = 400;

/**
 * Chunking service function to process document extracted text
 * @param {Object} document Document Mongoose document instance
 */
export const chunkDocument = async (document) => {
  try {
    // 1. Set status to processing
    await Document.findByIdAndUpdate(document._id, {
      chunkingStatus: 'processing',
      chunkingError: null,
    });

    if (!document.extractedText || document.extractedText.length === 0) {
      await Document.findByIdAndUpdate(document._id, {
        chunkingStatus: 'failed',
        chunkingError: 'No extracted text available for chunking',
      });
      return false;
    }

    // 2. Prevent duplicate chunks: Delete any existing chunks for this document
    await DocumentChunk.deleteMany({ documentId: document._id });

    const chunksToInsert = [];
    let globalChunkIndex = 0;

    // 3. Process each page in extractedText
    for (const pageObj of document.extractedText) {
      const pageNumber = pageObj.pageNumber;
      // Clean whitespace for the page
      const rawText = pageObj.text ? pageObj.text.replace(/\s+/g, ' ').trim() : '';

      if (!rawText) {
        continue;
      }

      // If page text is smaller than target chunk size, create 1 single chunk for this page
      if (rawText.length <= CHUNK_SIZE) {
        chunksToInsert.push({
          documentId: document._id,
          userId: document.userId,
          chunkIndex: globalChunkIndex++,
          pageNumber,
          text: rawText,
          characterCount: rawText.length,
        });
      } else {
        // Sliding window chunking with overlap for larger page text
        let start = 0;
        while (start < rawText.length) {
          let end = start + CHUNK_SIZE;
          let chunkText = rawText.slice(start, end).trim();

          if (chunkText.length > 0) {
            chunksToInsert.push({
              documentId: document._id,
              userId: document.userId,
              chunkIndex: globalChunkIndex++,
              pageNumber,
              text: chunkText,
              characterCount: chunkText.length,
            });
          }

          // Move start pointer forward by CHUNK_SIZE - OVERLAP_SIZE
          start += CHUNK_SIZE - OVERLAP_SIZE;
        }
      }
    }

    if (chunksToInsert.length === 0) {
      await Document.findByIdAndUpdate(document._id, {
        chunkingStatus: 'failed',
        chunkingError: 'Extracted text contained no non-empty content to chunk',
        chunkCount: 0,
      });
      return false;
    }

    // 4. Save chunk records to MongoDB
    await DocumentChunk.insertMany(chunksToInsert);

    // 5. Update document model with completion status and chunkCount
    await Document.findByIdAndUpdate(document._id, {
      chunkingStatus: 'completed',
      chunkCount: chunksToInsert.length,
      chunkedAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error(`Chunking Error for document ${document._id}:`, error);
    await Document.findByIdAndUpdate(document._id, {
      chunkingStatus: 'failed',
      chunkingError: 'Failed to process document chunking',
    });
    return false;
  }
};
