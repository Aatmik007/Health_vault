import mongoose from 'mongoose';

export const EMBEDDING_STATUSES = ['pending', 'processing', 'completed', 'failed'];
export const VECTOR_STATUSES = ['pending', 'processing', 'completed', 'failed'];

const documentChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Document ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: [true, 'Chunk index is required'],
    },
    pageNumber: {
      type: Number,
      required: [true, 'Page number is required'],
    },
    text: {
      type: String,
      required: [true, 'Chunk text content is required'],
      trim: true,
    },
    characterCount: {
      type: Number,
      required: [true, 'Character count is required'],
    },
    embedding: {
      type: [Number],
      default: undefined,
    },
    embeddingStatus: {
      type: String,
      enum: EMBEDDING_STATUSES,
      default: 'pending',
    },
    embeddingError: {
      type: String,
      default: null,
    },
    embeddedAt: {
      type: Date,
      default: null,
    },
    vectorStatus: {
      type: String,
      enum: VECTOR_STATUSES,
      default: 'pending',
    },
    vectorSyncError: {
      type: String,
      default: null,
    },
    vectorSyncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast retrieval of chunks by document and order
documentChunkSchema.index({ documentId: 1, chunkIndex: 1 });

const DocumentChunk = mongoose.model('DocumentChunk', documentChunkSchema);

export default DocumentChunk;
