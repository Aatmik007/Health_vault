import Document from '../models/Document.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Service to handle document database and file operations
 */

export const createDocumentRecord = async (docData) => {
  return await Document.create(docData);
};

export const fetchUserDocuments = async (userId, { search, documentType, sort }) => {
  const query = { userId };

  if (search && search.trim()) {
    query.$or = [
      { originalName: { $regex: search.trim(), $options: 'i' } },
      { documentType: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  if (documentType && documentType !== 'All') {
    query.documentType = documentType;
  }

  const sortOrder = sort === 'oldest' ? 1 : -1;

  return await Document.find(query).sort({ documentDate: sortOrder, createdAt: sortOrder });
};

export const fetchUserDocumentById = async (documentId, userId) => {
  return await Document.findOne({ _id: documentId, userId });
};

export const deleteUserDocumentRecord = async (documentId, userId) => {
  const document = await Document.findOne({ _id: documentId, userId });

  if (!document) {
    return null;
  }

  // Delete physical file from disk if exists
  try {
    const absolutePath = path.resolve(document.filePath);
    await fs.unlink(absolutePath);
  } catch (err) {
    console.warn(`File deletion warning for path ${document.filePath}:`, err.message);
  }

  // Delete DB record
  await Document.deleteOne({ _id: documentId, userId });
  return document;
};

export const fetchUserMetrics = async (userId) => {
  const total = await Document.countDocuments({ userId });
  const labReports = await Document.countDocuments({ userId, documentType: 'Lab Report' });
  const prescriptions = await Document.countDocuments({ userId, documentType: 'Prescription' });
  const consultations = await Document.countDocuments({ userId, documentType: 'Consultation Note' });

  return {
    total,
    labReports,
    prescriptions,
    consultations,
  };
};
