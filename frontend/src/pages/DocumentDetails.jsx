import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  getDocument,
  deleteDocument,
  getDocumentFileUrl,
  getDocumentChunks,
  triggerDocumentEmbedding,
  triggerVectorSync,
} from '../services/documentService';

const DocumentDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const targetPageFromUrl = searchParams.get('page') ? parseInt(searchParams.get('page'), 10) : null;

  const [doc, setDoc] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isVectorSyncing, setIsVectorSyncing] = useState(false);
  const [error, setError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState(targetPageFromUrl ? 'text' : 'preview'); // Auto open 'text' tab if ?page=X

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDocument(id);
      if (data.success) {
        setDoc(data.document);
      }
    } catch (err) {
      setError('Failed to fetch document details or unauthorized access.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    if (targetPageFromUrl) {
      setActiveTab('text');
    }
  }, [id, targetPageFromUrl]);

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    if (tab === 'chunks' && chunks.length === 0) {
      try {
        setLoadingChunks(true);
        const data = await getDocumentChunks(id);
        if (data.success) {
          setChunks(data.chunks);
        }
      } catch (err) {
        console.error('Failed to load document chunks:', err);
      } finally {
        setLoadingChunks(false);
      }
    }
  };

  const handleTriggerEmbeddings = async () => {
    try {
      setIsEmbedding(true);
      setFeedbackMsg('');
      setError('');
      const res = await triggerDocumentEmbedding(id);
      if (res.success) {
        setFeedbackMsg(res.message || 'Embeddings generated successfully.');
        await fetchDetails();
        if (activeTab === 'chunks') {
          handleTabChange('chunks');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate embeddings. Check backend GEMINI_API_KEY configuration.';
      setError(msg);
    } finally {
      setIsEmbedding(false);
    }
  };

  const handleTriggerVectorSync = async () => {
    try {
      setIsVectorSyncing(true);
      setFeedbackMsg('');
      setError('');
      const res = await triggerVectorSync(id);
      if (res.success) {
        setFeedbackMsg(res.message || 'Vectors synchronized to Pinecone successfully.');
        await fetchDetails();
        if (activeTab === 'chunks') {
          handleTabChange('chunks');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to sync vectors to Pinecone. Check backend PINECONE_API_KEY configuration.';
      setError(msg);
    } finally {
      setIsVectorSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${doc.originalName}"? This will also remove all chunks and Pinecone vectors.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteDocument(id);
      navigate('/documents');
    } catch (err) {
      setError('Failed to delete document.');
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getOcrStatusBadge = (status, ocrUsed) => {
    if (!ocrUsed && status === 'not_required') {
      return <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>Not Required</span>;
    }
    switch (status) {
      case 'completed':
        return <span className="badge badge-status-completed">Completed</span>;
      case 'processing':
        return <span className="badge badge-status-processing">Processing</span>;
      case 'failed':
        return <span className="badge badge-status-failed">Failed</span>;
      default:
        return <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>Not Required</span>;
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading document details...
      </div>
    );
  }

  if (error && !doc) {
    return (
      <div>
        <div className="alert alert-error">{error || 'Document not found'}</div>
        <Link to="/documents" className="btn btn-secondary">
          ← Back to Documents
        </Link>
      </div>
    );
  }

  const fileUrl = getDocumentFileUrl(doc._id);
  const downloadUrl = getDocumentFileUrl(doc._id, true);
  const isImage = doc.mimeType.startsWith('image/');
  const isPdf = doc.mimeType === 'application/pdf';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ marginBottom: '0.5rem' }}>
            <Link to="/documents" style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', textDecoration: 'none' }}>
              ← Back to Documents
            </Link>
          </div>
          <h1 className="page-title">{doc.originalName}</h1>
          <p className="page-subtitle">Document Metadata, Extraction & Citation Verification</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handleTriggerEmbeddings} className="btn btn-secondary" disabled={isEmbedding}>
            <span>⚡</span> {isEmbedding ? 'Embedding...' : '1. Generate Embeddings'}
          </button>
          <button onClick={handleTriggerVectorSync} className="btn" disabled={isVectorSyncing}>
            <span>🌲</span> {isVectorSyncing ? 'Syncing Vectors...' : '2. Sync to Pinecone'}
          </button>
          <a href={downloadUrl} download={doc.originalName} className="btn btn-secondary">
            <span>📥</span> Download File
          </a>
          <button onClick={handleDelete} className="btn btn-danger" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {feedbackMsg && <div className="alert alert-success">{feedbackMsg}</div>}

      {/* Target Page Nav Banner if ?page=X present */}
      {targetPageFromUrl && (
        <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📍 <strong>RAG Citation Navigation:</strong> Viewing target Page {targetPageFromUrl} referenced in answer.</span>
          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => navigate(`/documents/${id}`)}>
            Clear Filter
          </button>
        </div>
      )}

      {/* Attributes & Processing Status Card */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Document Attributes & RAG Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div className="form-label">Type</div>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{doc.documentType}</div>
          </div>
          <div>
            <div className="form-label">Extraction</div>
            <div>{getStatusBadge(doc.extractionStatus)}</div>
          </div>
          <div>
            <div className="form-label">OCR Used</div>
            <div style={{ fontWeight: '600', color: doc.ocrUsed ? '#60a5fa' : 'var(--text-secondary)' }}>
              {doc.ocrUsed ? 'Yes (OCR Fallback)' : 'No (Text PDF)'}
            </div>
          </div>
          <div>
            <div className="form-label">OCR Status</div>
            <div>{getOcrStatusBadge(doc.ocrStatus, doc.ocrUsed)}</div>
          </div>
          <div>
            <div className="form-label">Chunking</div>
            <div>{getStatusBadge(doc.chunkingStatus)}</div>
          </div>
          <div>
            <div className="form-label">Embeddings</div>
            <div>{getStatusBadge(doc.embeddingStatus)}</div>
          </div>
          <div>
            <div className="form-label">Vector Sync</div>
            <div>{getStatusBadge(doc.vectorStatus)}</div>
          </div>
          <div>
            <div className="form-label">Embedded Chunks</div>
            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
              {doc.embeddedChunkCount || 0} / {doc.chunkCount || 0}
            </div>
          </div>
          <div>
            <div className="form-label">Vectors Synced</div>
            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
              {doc.vectorCount || 0} vectors
            </div>
          </div>
        </div>
      </div>

      {/* Main View Tabs */}
      <div className="tab-container">
        <button
          className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => handleTabChange('preview')}
        >
          📄 Document Preview
        </button>
        <button
          className={`tab-button ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => handleTabChange('text')}
        >
          📝 Extracted Text ({doc.extractedText?.length || 0} Pages)
        </button>
        <button
          className={`tab-button ${activeTab === 'chunks' ? 'active' : ''}`}
          onClick={() => handleTabChange('chunks')}
        >
          🧩 Text Chunks & Vectors ({doc.chunkCount || 0})
        </button>
      </div>

      {/* Tab Content: Document Preview */}
      {activeTab === 'preview' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>File Preview</h3>
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={doc.originalName}
              style={{ width: '100%', height: '650px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#ffffff' }}
            />
          ) : isImage ? (
            <div style={{ textAlign: 'center', backgroundColor: '#070a10', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <img
                src={fileUrl}
                alt={doc.originalName}
                style={{ maxWidth: '100%', maxHeight: '650px', borderRadius: '4px', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Preview is not available for this file type ({doc.mimeType}). You can{' '}
              <a href={downloadUrl} download={doc.originalName} style={{ color: 'var(--accent-primary)' }}>
                download the file directly
              </a>.
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Extracted Page-by-Page Text */}
      {activeTab === 'text' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Structured Text Extraction Result</h3>

          {doc.extractionStatus === 'failed' && (
            <div className="alert alert-error">
              {doc.extractionError || 'Text extraction failed for this document.'}
            </div>
          )}

          {doc.extractedText && doc.extractedText.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {doc.extractedText.map((page) => {
                const isTargetPage = targetPageFromUrl === page.pageNumber;
                return (
                  <div
                    key={page.pageNumber}
                    style={{
                      padding: isTargetPage ? '1rem' : 0,
                      borderRadius: isTargetPage ? '8px' : 0,
                      border: isTargetPage ? '2px solid var(--accent-primary)' : 'none',
                      backgroundColor: isTargetPage ? 'rgba(2, 132, 199, 0.06)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: isTargetPage ? 'var(--accent-primary)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Page {page.pageNumber}
                      </span>
                      {isTargetPage && (
                        <span className="badge badge-status-completed" style={{ fontSize: '0.75rem' }}>
                          📍 RAG Citation Source Page
                        </span>
                      )}
                    </div>
                    <div className="extracted-text-box" style={{ borderColor: isTargetPage ? 'var(--accent-primary)' : 'var(--border-color)' }}>
                      {page.text || '[ No text found on this page ]'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No extracted text pages available.
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Text Chunks */}
      {activeTab === 'chunks' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Document Chunks & Vector Database Sync Status</h3>

          {doc.chunkingStatus === 'failed' && (
            <div className="alert alert-error">
              {doc.chunkingError || 'Document chunking failed.'}
            </div>
          )}

          {loadingChunks ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading document chunks and Pinecone vector status...
            </div>
          ) : chunks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {chunks.map((chunk) => (
                <div key={chunk._id || chunk.chunkIndex}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                        Chunk #{chunk.chunkIndex} • Page {chunk.pageNumber}
                      </span>
                      {getStatusBadge(chunk.embeddingStatus)}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pinecone Vector:</span>
                      {getStatusBadge(chunk.vectorStatus || 'pending')}
                    </div>
                    <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      {chunk.characterCount} chars | {chunk.embeddingDimensions ? `${chunk.embeddingDimensions} dim vector` : 'No vector yet'}
                    </span>
                  </div>
                  <div className="extracted-text-box">
                    {chunk.text}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No document chunks generated.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentDetails;
