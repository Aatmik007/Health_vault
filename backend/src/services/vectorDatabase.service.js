import Document from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';
import { getPineconeClient } from '../config/pinecone.js';

/**
 * Service to sync DocumentChunk embeddings into Pinecone Vector Database
 * @param {string} documentId Document ObjectId
 * @param {string} userId User ObjectId
 */
export const upsertDocumentChunks = async (documentId, userId) => {
  try {
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) {
      console.warn(`Document ${documentId} not found or unauthorized for vector sync`);
      return false;
    }

    // 1. Mark status as processing
    await Document.findByIdAndUpdate(documentId, {
      vectorStatus: 'processing',
      vectorSyncError: null,
    });

    // 2. Fetch completed chunks with valid vector embeddings
    const chunks = await DocumentChunk.find({
      documentId,
      userId,
      embeddingStatus: 'completed',
      embedding: { $exists: true, $ne: [] },
    }).sort({ chunkIndex: 1 });

    if (!chunks || chunks.length === 0) {
      await Document.findByIdAndUpdate(documentId, {
        vectorStatus: 'failed',
        vectorSyncError: 'No valid chunk embeddings available to sync to Pinecone',
        vectorCount: 0,
      });
      return false;
    }

    // 3. Verify vector dimensions matching
    const sampleDimension = chunks[0].embedding.length;
    for (const chunk of chunks) {
      if (!chunk.embedding || chunk.embedding.length !== sampleDimension) {
        await Document.findByIdAndUpdate(documentId, {
          vectorStatus: 'failed',
          vectorSyncError: `Vector dimension mismatch detected in chunk index ${chunk.chunkIndex}`,
        });
        return false;
      }
    }

    // 4. Initialize Pinecone Client
    const pc = getPineconeClient();
    if (!pc) {
      await Document.findByIdAndUpdate(documentId, {
        vectorStatus: 'failed',
        vectorSyncError: 'PINECONE_API_KEY is not configured in backend environment variables',
      });
      return false;
    }

    const indexName = process.env.PINECONE_INDEX_NAME || 'healthvault';
    const index = pc.index(indexName);

    // 5. Format vectors with deterministic IDs and user isolation metadata
    const vectors = chunks.map((chunk) => ({
      id: chunk._id.toString(),
      values: chunk.embedding,
      metadata: {
        userId: chunk.userId.toString(),
        documentId: chunk.documentId.toString(),
        chunkId: chunk._id.toString(),
        chunkIndex: Number(chunk.chunkIndex),
        pageNumber: Number(chunk.pageNumber),
      },
    }));

    // 6. Upsert vectors into Pinecone Index
    await index.upsert(vectors);

    // 7. Update MongoDB chunk records
    for (const chunk of chunks) {
      chunk.vectorStatus = 'completed';
      chunk.vectorSyncError = null;
      chunk.vectorSyncedAt = new Date();
      await chunk.save();
    }

    // 8. Update Document status upon successful vector sync
    await Document.findByIdAndUpdate(documentId, {
      vectorStatus: 'completed',
      vectorCount: vectors.length,
      vectorSyncedAt: new Date(),
      vectorSyncError: null,
    });

    return true;
  } catch (error) {
    console.error(`Pinecone Vector Sync Error for document ${documentId}:`, error.message);
    await Document.findByIdAndUpdate(documentId, {
      vectorStatus: 'failed',
      vectorSyncError: error.message || 'Failed to sync vectors to Pinecone database',
    });
    return false;
  }
};

/**
 * Delete vectors for a specific document from Pinecone
 * @param {string} documentId Document ObjectId
 */
export const deleteDocumentVectors = async (documentId) => {
  const pc = getPineconeClient();
  if (!pc) return;

  try {
    const indexName = process.env.PINECONE_INDEX_NAME || 'healthvault';
    const index = pc.index(indexName);

    // Fetch chunk IDs for deterministic deletion
    const chunks = await DocumentChunk.find({ documentId }).select('_id');
    const vectorIds = chunks.map((c) => c._id.toString());

    if (vectorIds.length > 0) {
      await index.deleteMany(vectorIds);
    }
  } catch (error) {
    console.warn(`Pinecone vector purge error for document ${documentId}:`, error.message);
  }
};
