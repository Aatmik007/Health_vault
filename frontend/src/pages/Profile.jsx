import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">Manage your account settings and credentials</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Account Information</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">Full Name</label>
          <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{user?.name || 'N/A'}</div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">Email Address</label>
          <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{user?.email || 'N/A'}</div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Account Member Since</label>
          <div style={{ color: 'var(--text-secondary)' }}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>

        <button className="btn btn-danger" onClick={logout}>
          Sign Out of HealthVault
        </button>
      </div>
    </div>
  );
};

export default Profile;
