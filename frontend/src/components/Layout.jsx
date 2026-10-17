import React, { useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <header className="top-navbar">
        <div className="brand-logo">
          <span>HealthVault</span>
          <span className="brand-badge">SaaS</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Medical Document Intelligence
        </div>
      </header>

      <div className="layout-body">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span>📊</span> Dashboard
            </NavLink>
            <NavLink to="/documents" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span>📁</span> Documents
            </NavLink>
            <NavLink to="/timeline" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span>🕒</span> Timeline
            </NavLink>
            <NavLink to="/assistant" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span>💬</span> Assistant
            </NavLink>
            <NavLink to="/compare" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span>🔄</span> Compare
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span>👤</span> Profile
            </NavLink>
            {user && (
              <div className="user-profile-summary">
                <div className="user-profile-name">{user.name}</div>
                <div className="user-profile-email">{user.email}</div>
              </div>
            )}
            <button onClick={handleLogout} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
              <span>🚪</span> Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
