import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
          HealthVault
        </Link>
      </div>
      <div className="navbar-links">
        <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
          Dashboard
        </Link>
        <Link to="/login" className={location.pathname === '/login' ? 'active' : ''}>
          Login
        </Link>
        <Link to="/register" className={location.pathname === '/register' ? 'active' : ''}>
          Register
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
