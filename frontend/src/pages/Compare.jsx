import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocuments, compareDocuments } from '../services/documentService';

const Compare = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docIdA, setDocIdA] = useState('');
  const [docIdB, setDocIdB] = useState('');
  const [comparison, setComparison] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDocList = async () => {
      try {
        setLoadingDocs(true);
        const data = await getDocuments({ sort: 'newest' });
        if (data.success && data.documents) {
          setDocuments(data.documents);
          if (data.documents.length >= 2) {
            setDocIdA(data.documents[0]._id);
            setDocIdB(data.documents[1]._id);
          } else if (data.documents.length === 1) {
            setDocIdA(data.documents[0]._id);
          }
        }
      } catch (err) {
        console.error('Fetch documents error:', err);
        setError('Failed to load document list.');
      } finally {
        setLoadingDocs(false);
      }
    };

    fetchDocList();
  }, []);

  const handleCompare = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setComparison(null);

    if (!docIdA || !docIdB) {
      setError('Please select both Document A and Document B to compare.');
      return;
    }

    if (docIdA === docIdB) {
      setError('Please select two different documents. Cannot compare a document with itself.');
      return;
    }

    try {
      setIsComparing(true);
      const res = await compareDocuments(docIdA, docIdB);
      if (res.success) {
        setComparison(res);
      }
    } catch (err) {
      console.error('Compare request error:', err);
      const msg = err.response?.data?.message || 'Failed to compare documents. Please try again.';
      setError(msg);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Report Comparison</h1>
          <p className="page-subtitle">Compare documented contents between two medical reports side-by-side</p>
        </div>
      </div>

      {/* Neutral Safety Notice Banner */}
      <div className="alert alert-info" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
        ℹ️ <strong>Factual Reference Notice:</strong> This comparison displays documented values and text side-by-side as stated in your source files. It does not infer whether changes represent clinical improvement or worsening.
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {/* Document Selection Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Select Reports to Compare</h3>
        
        {loadingDocs ? (
          <div style={{ color: 'var(--text-secondary)' }}>Loading document library...</div>
        ) : documents.length === 0 ? (
          <div className="alert alert-warning">
            No medical documents available. Upload documents in the Documents tab to use report comparison.
          </div>
        ) : documents.length === 1 ? (
          <div className="alert alert-warning">
            You need at least two documents to compare. Currently, only 1 document is uploaded.
          </div>
        ) : (
          <form onSubmit={handleCompare}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label className="form-label">Report A (First Document)</label>
                <select
                  className="form-control"
                  value={docIdA}
                  onChange={(e) => setDocIdA(e.target.value)}
                >
                  {documents.map((doc) => (
                    <option key={`a_${doc._id}`} value={doc._id}>
                      {doc.originalName} ({new Date(doc.documentDate).toLocaleDateString()}) - {doc.documentType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Report B (Second Document)</label>
                <select
                  className="form-control"
                  value={docIdB}
                  onChange={(e) => setDocIdB(e.target.value)}
                >
                  {documents.map((doc) => (
                    <option key={`b_${doc._id}`} value={doc._id}>
                      {doc.originalName} ({new Date(doc.documentDate).toLocaleDateString()}) - {doc.documentType}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isComparing || !docIdA || !docIdB || docIdA === docIdB}
              >
                {isComparing ? 'Comparing Reports...' : '🔄 Compare Reports'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Comparison Results Section */}
      {comparison && (
        <div>
          {/* Header Metadata Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ borderColor: 'var(--accent-color)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-color)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Report A
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {comparison.reportA.documentName}
              </h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div>Type: <strong>{comparison.reportA.documentType}</strong></div>
                <div>Date: <strong>{new Date(comparison.reportA.documentDate).toLocaleDateString()}</strong></div>
                <div>Extracted Pages: <strong>{comparison.reportA.pageCount}</strong></div>
              </div>
            </div>

            <div className="card" style={{ borderColor: '#60a5fa' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Report B
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {comparison.reportB.documentName}
              </h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div>Type: <strong>{comparison.reportB.documentType}</strong></div>
                <div>Date: <strong>{new Date(comparison.reportB.documentDate).toLocaleDateString()}</strong></div>
                <div>Extracted Pages: <strong>{comparison.reportB.pageCount}</strong></div>
              </div>
            </div>
          </div>

          {/* Common Documented Values Table */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: 0 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="card-title">Common Documented Metrics & Values</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Side-by-side comparison of test metrics identified in both reports
              </p>
            </div>

            {comparison.comparison.commonValues.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No overlapping key-value metrics detected between these two reports.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Metric / Test Item</th>
                      <th>Report A Value</th>
                      <th>Report B Value</th>
                      <th style={{ textAlign: 'right' }}>Source Traceability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.comparison.commonValues.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{row.metricName}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{row.valueA}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{row.valueB}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/documents/${comparison.reportA.documentId}?page=${row.pageA}`)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.725rem', marginRight: '0.35rem' }}
                            title="View source page in Report A"
                          >
                            [ A: Pg {row.pageA} ]
                          </button>
                          <button
                            onClick={() => navigate(`/documents/${comparison.reportB.documentId}?page=${row.pageB}`)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.725rem' }}
                            title="View source page in Report B"
                          >
                            [ B: Pg {row.pageB} ]
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Unique Items in Report A and Report B */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {/* Report A Only */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
                Unique to {comparison.reportA.documentName} ({comparison.comparison.reportAOnlyCount})
              </h3>
              {comparison.comparison.reportAOnly.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No unique test metrics exclusive to Report A.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {comparison.comparison.reportAOnly.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div>
                        <strong>{item.metricName}</strong>: {item.value}
                      </div>
                      <button
                        onClick={() => navigate(`/documents/${comparison.reportA.documentId}?page=${item.pageNumber}`)}
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem' }}
                      >
                        [ View Pg {item.pageNumber} ]
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Report B Only */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
                Unique to {comparison.reportB.documentName} ({comparison.comparison.reportBOnlyCount})
              </h3>
              {comparison.comparison.reportBOnly.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No unique test metrics exclusive to Report B.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {comparison.comparison.reportBOnly.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div>
                        <strong>{item.metricName}</strong>: {item.value}
                      </div>
                      <button
                        onClick={() => navigate(`/documents/${comparison.reportB.documentId}?page=${item.pageNumber}`)}
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem' }}
                      >
                        [ View Pg {item.pageNumber} ]
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compare;
