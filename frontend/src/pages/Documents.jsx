import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDocuments, deleteDocument } from '../services/documentService';
import UploadModal from '../components/UploadModal';

const DOCUMENT_TYPES = [
  'All',
  'Lab Report',
  'Prescription',
  'Discharge Summary',
  'Consultation Note',
  'Imaging Report',
  'Other',
];

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [documentType, setDocumentType] = useState('All');
  const [sort, setSort] = useState('newest');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDocuments({ search, documentType, sort });
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      setError('Failed to load documents. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocs();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, documentType, sort]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((doc) => doc._id !== id));
    } catch (err) {
      setError('Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'Lab Report':
        return 'badge-lab';
      case 'Prescription':
        return 'badge-prescription';
      case 'Consultation Note':
        return 'badge-consultation';
      default:
        return 'badge-lab';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-status-completed">Completed</span>;
      case 'processing':
        return <span className="badge badge-status-processing">Processing</span>;
      case 'failed':
        return <span className="badge badge-status-failed">Failed</span>;
      default:
        return <span className="badge badge-status-pending">Pending</span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Medical Documents</h1>
          <p className="page-subtitle">Manage, view, and organize your medical files</p>
        </div>
        <button className="btn" onClick={() => setIsUploadModalOpen(true)}>
          <span>📤</span> Upload Document
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label" style={{ marginBottom: '0.2rem' }}>Search Documents</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by file name or document type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" style={{ marginBottom: '0.2rem' }}>Document Type</label>
            <select
              className="form-select"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ marginBottom: '0.2rem' }}>Sort By Date</label>
            <select
              className="form-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Document Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading document library...
          </div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' }}>No medical documents found</p>
            <p style={{ fontSize: '0.875rem' }}>
              {search || documentType !== 'All'
                ? 'Try adjusting your search query or document type filter.'
                : 'Click "Upload Document" to add your first lab report, prescription, or clinical note.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Type</th>
                  <th>Document Date</th>
                  <th>Text Extraction</th>
                  <th>Size</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc._id}>
                    <td>
                      <Link
                        to={`/documents/${doc._id}`}
                        style={{ color: 'var(--text-primary)', fontWeight: '600', textDecoration: 'none' }}
                      >
                        {doc.originalName}
                      </Link>
                      {doc.ocrUsed && (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#3b82f620',
                            color: '#60a5fa',
                            border: '1px solid #3b82f640',
                            fontSize: '0.65rem',
                            padding: '0.15rem 0.4rem',
                            marginLeft: '0.5rem',
                          }}
                          title="Extracted using OCR"
                        >
                          OCR
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(doc.documentType)}`}>{doc.documentType}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(doc.documentDate).toLocaleDateString()}
                    </td>
                    <td>{getStatusBadge(doc.extractionStatus)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatFileSize(doc.fileSize)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/documents/${doc._id}`}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem', marginRight: '0.5rem' }}
                      >
                        View Details
                      </Link>
                      <button
                        onClick={() => handleDelete(doc._id, doc.originalName)}
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem' }}
                        disabled={deletingId === doc._id}
                      >
                        {deletingId === doc._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => fetchDocs()}
      />
    </div>
  );
};

export default Documents;
