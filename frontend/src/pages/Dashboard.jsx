import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getDocuments, getDocumentMetrics } from '../services/documentService';
import UploadModal from '../components/UploadModal';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [metrics, setMetrics] = useState({ total: 0, labReports: 0, prescriptions: 0, consultations: 0 });
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsRes, docsRes] = await Promise.all([
        getDocumentMetrics(),
        getDocuments({ sort: 'newest' }),
      ]);

      if (metricsRes.success) {
        setMetrics(metricsRes.metrics);
      }

      if (docsRes.success) {
        setRecentDocs(docsRes.documents.slice(0, 5));
      }
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name || 'User'}</h1>
          <p className="page-subtitle">Here is an overview of your medical document vault</p>
        </div>
        <button className="btn" onClick={() => setIsUploadModalOpen(true)}>
          <span>📤</span> Upload Document
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Documents</div>
          <div className="metric-value">{loading ? '...' : metrics.total}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Lab Reports</div>
          <div className="metric-value">{loading ? '...' : metrics.labReports}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Prescriptions</div>
          <div className="metric-value">{loading ? '...' : metrics.prescriptions}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Consultations</div>
          <div className="metric-value">{loading ? '...' : metrics.consultations}</div>
        </div>
      </div>

      {/* Main Grid: Recent Documents & Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Recent Documents Table */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ marginBottom: 0 }}>Recent Documents</h2>
            <Link to="/documents" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: '500', textDecoration: 'none' }}>
              View All →
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading recent documents...
            </div>
          ) : recentDocs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No medical documents uploaded yet.
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Size</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocs.map((doc) => (
                    <tr key={doc._id}>
                      <td>
                        <Link
                          to={`/documents/${doc._id}`}
                          style={{ color: 'var(--text-primary)', fontWeight: '500', textDecoration: 'none' }}
                        >
                          {doc.originalName}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${getBadgeClass(doc.documentType)}`}>{doc.documentType}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(doc.documentDate).toLocaleDateString()}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{formatFileSize(doc.fileSize)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* System Activity Summary */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h2 className="card-title">Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setIsUploadModalOpen(true)}>
              <span>📤</span> Upload New Medical File
            </button>
            <Link to="/documents" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <span>📁</span> Browse All Documents
            </Link>
            <Link to="/timeline" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <span>🕒</span> View Document Timeline
            </Link>
            <Link to="/compare" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <span>🔄</span> Compare Medical Reports
            </Link>
            <Link to="/profile" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <span>👤</span> View Account Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => loadDashboardData()}
      />
    </div>
  );
};

export default Dashboard;
