import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDocuments } from '../services/documentService';
import { askQuestion } from '../services/ragService';

const Assistant = () => {
  const [question, setQuestion] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loading, setLoading] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [expandedChunkId, setExpandedChunkId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDocList = async () => {
      try {
        const data = await getDocuments();
        if (data.success) {
          setDocuments(data.documents);
        }
      } catch (err) {
        console.error('Failed to load document list for assistant scope:', err);
      }
    };
    fetchDocList();
  }, []);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    try {
      setLoading(true);
      setError('');
      setAnswerResult(null);
      setExpandedChunkId(null);

      const res = await askQuestion({
        question: question.trim(),
        documentId: selectedDocId || undefined,
      });

      if (res.success) {
        setAnswerResult(res);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to process question. Please check backend connection and configuration.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandChunk = (chunkId) => {
    setExpandedChunkId((prev) => (prev === chunkId ? null : chunkId));
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Intelligence Assistant</h1>
          <p className="page-subtitle">Ask questions grounded strictly in your personal medical documents</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Scope & Question Form Card */}
      <div className="card">
        <form onSubmit={handleAsk}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Search Scope</label>
            <select
              className="form-select"
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              disabled={loading}
              style={{ maxWidth: '400px' }}
            >
              <option value="">All Documents</option>
              {documents.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.originalName} ({doc.documentType})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ask About Your Medical Records</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., What was my hemoglobin level? What medicines were prescribed?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={loading}
                required
              />
              <button type="submit" className="btn" disabled={loading || !question.trim()}>
                {loading ? 'Searching & Grounding...' : 'Ask Question'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Retrieving relevant document chunks & generating grounded answer...
          </p>
        </div>
      )}

      {/* Answer & Sources Results */}
      {answerResult && !loading && (
        <div>
          {/* Grounded Answer Card */}
          <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
            <h3 className="card-title" style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem' }}>
              Grounded Answer
            </h3>
            <div style={{ fontSize: '0.975rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {answerResult.answer}
            </div>
          </div>

          {/* Sources Card */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              Cited Document Sources ({answerResult.sources?.length || 0})
            </h3>

            {answerResult.sources && answerResult.sources.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {answerResult.sources.map((src, index) => {
                  const isExpanded = expandedChunkId === src.chunkId;
                  return (
                    <div
                      key={src.chunkId || index}
                      style={{
                        padding: '1rem',
                        backgroundColor: 'var(--bg-sidebar)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            📄 {src.documentName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Page {src.pageNumber} • <span className="badge badge-lab" style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>{src.documentType}</span>
                            {src.documentDate && ` • ${new Date(src.documentDate).toLocaleDateString()}`}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => toggleExpandChunk(src.chunkId)}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem' }}
                          >
                            {isExpanded ? 'Hide Extracted Text' : 'Show Extracted Text'}
                          </button>
                          <Link
                            to={`/documents/${src.documentId}?page=${src.pageNumber}`}
                            className="btn"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
                          >
                            View Source →
                          </Link>
                        </div>
                      </div>

                      {/* Expandable Exact Chunk Text */}
                      {isExpanded && (
                        <div style={{ marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                            Exact Retrieved Source Chunk (Page {src.pageNumber})
                          </div>
                          <div className="extracted-text-box">
                            {src.text || '[ Source chunk text empty ]'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No document sources were retrieved for this query.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Assistant;
