import mongoose from 'mongoose';

export const DOCUMENT_TYPES = [
  'Lab Report',
  'Prescription',
  'Discharge Summary',
  'Consultation Note',
  'Imaging Report',
  'Other',
];

export const EXTRACTION_STATUSES = ['pending', 'processing', 'completed', 'failed'];
export const OCR_STATUSES = ['not_required', 'pending', 'processing', 'completed', 'failed'];
export const CHUNKING_STATUSES = ['pending', 'processing', 'completed', 'failed'];
export const EMBEDDING_STATUSES = ['pending', 'processing', 'completed', 'failed'];
export const VECTOR_STATUSES = ['pending', 'processing', 'completed', 'failed'];

const pageTextSchema = new mongoose.Schema(
  {
    pageNumber: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original document name is required'],
      trim: true,
    },
    storedFileName: {
      type: String,
      required: [true, 'Stored filename is required'],
    },
    filePath: {
      type: String,
      required: [true, 'File path is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      enum: {
        values: DOCUMENT_TYPES,
        message: '{VALUE} is not a supported document type',
      },
    },
    documentDate: {
      type: Date,
      required: [true, 'Document date is required'],
      default: Date.now,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    extractionStatus: {
      type: String,
      enum: EXTRACTION_STATUSES,
      default: 'pending',
    },
    extractedText: [pageTextSchema],
    extractionError: {
      type: String,
      default: null,
    },
    extractedAt: {
      type: Date,
      default: null,
    },
    ocrStatus: {
      type: String,
      enum: OCR_STATUSES,
      default: 'not_required',
    },
    ocrUsed: {
      type: Boolean,
      default: false,
    },
    ocrError: {
      type: String,
      default: null,
    },
    ocrCompletedAt: {
      type: Date,
      default: null,
    },
    chunkingStatus: {
      type: String,
      enum: CHUNKING_STATUSES,
      default: 'pending',
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    chunkingError: {
      type: String,
      default: null,
    },
    chunkedAt: {
      type: Date,
      default: null,
    },
    embeddingStatus: {
      type: String,
      enum: EMBEDDING_STATUSES,
      default: 'pending',
    },
    embeddedChunkCount: {
      type: Number,
      default: 0,
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
    vectorCount: {
      type: Number,
      default: 0,
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

const Document = mongoose.model('Document', documentSchema);

export default Document;
