import Document from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';
import { generateEmbedding } from './embedding.service.js';

/**
 * Service to process document chunks sequentially and generate Gemini embeddings
 * @param {string} documentId Document ObjectId
 * @param {string} userId User ObjectId
 */
export const generateDocumentEmbeddings = async (documentId, userId) => {
  try {
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) {
      console.warn(`Document ${documentId} not found or unauthorized for embedding generation`);
      return false;
    }

    // 1. Set status to processing
    await Document.findByIdAndUpdate(documentId, {
      embeddingStatus: 'processing',
      embeddingError: null,
    });

    // 2. Fetch chunks belonging to document and user
    const chunks = await DocumentChunk.find({ documentId, userId }).sort({ chunkIndex: 1 });

    if (!chunks || chunks.length === 0) {
      await Document.findByIdAndUpdate(documentId, {
        embeddingStatus: 'failed',
        embeddingError: 'No document chunks available to generate embeddings',
        embeddedChunkCount: 0,
      });
      return false;
    }

    let completedCount = 0;

    // 3. Process chunks sequentially
    for (const chunk of chunks) {
      // Avoid duplicate API calls: skip chunks already successfully embedded
      if (chunk.embeddingStatus === 'completed' && chunk.embedding && chunk.embedding.length > 0) {
        completedCount++;
        continue;
      }

      const textToEmbed = chunk.text ? chunk.text.trim() : '';

      // Skip empty chunks
      if (!textToEmbed) {
        chunk.embeddingStatus = 'failed';
        chunk.embeddingError = 'Empty chunk text content';
        await chunk.save();
        continue;
      }

      try {
        chunk.embeddingStatus = 'processing';
        await chunk.save();

        const vector = await generateEmbedding(textToEmbed);

        chunk.embedding = vector;
        chunk.embeddingStatus = 'completed';
        chunk.embeddingError = null;
        chunk.embeddedAt = new Date();
        await chunk.save();

        completedCount++;
      } catch (chunkError) {
        console.error(`Error embedding chunk ${chunk.chunkIndex} for document ${documentId}:`, chunkError.message);
        chunk.embeddingStatus = 'failed';
        chunk.embeddingError = chunkError.message || 'Embedding generation failed';
        await chunk.save();
      }
    }

    // 4. Update Document model status upon pipeline completion
    if (completedCount > 0) {
      await Document.findByIdAndUpdate(documentId, {
        embeddingStatus: 'completed',
        embeddedChunkCount: completedCount,
        embeddedAt: new Date(),
        embeddingError: null,
      });
      return true;
    } else {
      await Document.findByIdAndUpdate(documentId, {
        embeddingStatus: 'failed',
        embeddingError: 'Failed to generate embeddings for document chunks',
        embeddedChunkCount: 0,
      });
      return false;
    }
  } catch (error) {
    console.error(`Document Embedding Service Error for ${documentId}:`, error.message);
    await Document.findByIdAndUpdate(documentId, {
      embeddingStatus: 'failed',
      embeddingError: error.message || 'Server error during document embedding process',
    });
    return false;
  }
};
