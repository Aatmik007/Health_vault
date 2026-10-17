import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTimeline } from '../services/timelineService';

const DOCUMENT_TYPES = [
  'All',
  'Lab Report',
  'Prescription',
  'Discharge Summary',
  'Consultation Note',
  'Imaging Report',
  'Other',
];

const Timeline = () => {
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentType, setDocumentType] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getTimeline({ documentType, startDate, endDate });
      if (data.success) {
        setTimeline(data.timeline || []);
      }
    } catch (err) {
      console.error('Fetch timeline error:', err);
      setError('Failed to load medical document timeline. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
  }, [documentType, startDate, endDate]);

  const handleClearFilters = () => {
    setDocumentType('All');
    setStartDate('');
    setEndDate('');
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Medical Document Timeline</h1>
          <p className="page-subtitle">Chronological record of your uploaded medical documents</p>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="alert alert-info" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
        ℹ️ <strong>Document Navigation Notice:</strong> This timeline displays documented records chronologically for organization and reference. It does not infer medical condition progress or make clinical determinations.
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label">Document Type</label>
            <select
              className="form-control"
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

          <div style={{ flex: '1 1 150px' }}>
            <label className="form-label">From Date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <label className="form-label">To Date</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <button
              onClick={handleClearFilters}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {/* Timeline View */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading document timeline...
        </div>
      ) : timeline.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' }}>No timeline records found</p>
          <p style={{ fontSize: '0.875rem' }}>
            {documentType !== 'All' || startDate || endDate
              ? 'Try adjusting your document type or date range filter.'
              : 'Upload medical documents to automatically build your chronological timeline.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border-color)' }}>
            {timeline.map((item, index) => {
              const formattedDate = new Date(item.documentDate || item.uploadedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={item.documentId}
                  style={{
                    position: 'relative',
                    marginBottom: index === timeline.length - 1 ? 0 : '1.75rem',
                  }}
                >
                  {/* Timeline Bullet Node */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-2.05rem',
                      top: '0.2rem',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-color)',
                      border: '2px solid var(--bg-primary)',
                    }}
                  />

                  {/* Node Content */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: '500' }}>
                        📅 {formattedDate}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                        {item.originalName}
                        {item.ocrUsed && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#3b82f620',
                              color: '#60a5fa',
                              border: '1px solid #3b82f640',
                              fontSize: '0.65rem',
                              padding: '0.1rem 0.4rem',
                              marginLeft: '0.5rem',
                            }}
                          >
                            OCR
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`badge ${getBadgeClass(item.documentType)}`}>{item.documentType}</span>
                        {item.fileSize && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            • {formatFileSize(item.fileSize)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => navigate(`/documents/${item.documentId}`)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        [ View ]
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;
