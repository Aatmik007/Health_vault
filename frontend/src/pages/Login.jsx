import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverifiedEmail('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email.trim(), password);
    setIsSubmitting(false);

    if (result && result.success) {
      navigate('/dashboard');
    } else {
      setError(result?.message || 'Login failed. Please check your credentials.');
      if (result?.isUnverified) {
        setUnverifiedEmail(result.email || email.trim());
      }
    }
  };

  return (
    <div className="auth-page-container">
      {/* Left side: Brand overview */}
      <div className="auth-brand-side">
        <div style={{ maxWidth: '440px' }}>
          <div className="brand-logo" style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>
            <span>HealthVault</span>
            <span className="brand-badge" style={{ fontSize: '0.8rem' }}>SaaS</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', lineHeight: '1.2', marginBottom: '1rem' }}>
            Your personal medical document intelligence workspace.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.975rem', lineHeight: '1.6' }}>
            Centralize lab reports, prescriptions, and consultation records with structured access and intelligent document management.
          </p>
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="auth-form-side">
        <div className="auth-form-wrapper">
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Sign In</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Enter your credentials to access your secure vault
          </p>

          {error && (
            <div className="alert alert-error" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>{error}</div>
              {unverifiedEmail && (
                <Link
                  to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                  style={{
                    color: 'var(--accent-primary)',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    textDecoration: 'underline',
                  }}
                >
                  Verify Email Address Now &rarr;
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>At least 8 characters</span>
              </div>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.5rem' }} disabled={isSubmitting}>
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
