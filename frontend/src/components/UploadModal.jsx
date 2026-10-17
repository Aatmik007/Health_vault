import React, { useState } from 'react';
import { uploadDocument } from '../services/documentService';

const DOCUMENT_TYPES = [
  'Lab Report',
  'Prescription',
  'Discharge Summary',
  'Consultation Note',
  'Imaging Report',
  'Other',
];

const UploadModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('Lab Report');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError('');

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = selectedFile.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      setError('Invalid file type. Only PDF, JPG, JPEG, and PNG files are supported.');
      setFile(null);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds maximum limit of 10 MB.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please select a document file to upload.');
      return;
    }

    if (!documentType) {
      setError('Please select a valid document type.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      formData.append('documentDate', documentDate);

      const response = await uploadDocument(formData);
      setIsUploading(false);

      if (response.success) {
        onSuccess && onSuccess(response.document);
        onClose();
      }
    } catch (err) {
      setIsUploading(false);
      const msg = err.response?.data?.message || 'Failed to upload document. Please try again.';
      setError(msg);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Upload Medical Document</h3>
          <button className="modal-close" onClick={onClose} disabled={isUploading}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Document File (PDF, JPG, PNG)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="form-input"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {file && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Selected: <strong>{file.name}</strong> ({formatFileSize(file.size)})
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Document Type</label>
            <select
              className="form-select"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              disabled={isUploading}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Document Date</label>
            <input
              type="date"
              className="form-input"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              disabled={isUploading}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isUploading}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={isUploading}>
              {isUploading ? 'Uploading Document...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
