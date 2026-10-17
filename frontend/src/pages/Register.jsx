import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPendingVerificationEmail('');

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(name.trim(), email.trim(), password);
    setIsSubmitting(false);

    if (result && result.success) {
      navigate(`/verify-email?email=${encodeURIComponent(result.email || email.trim())}`);
    } else {
      setError(result?.message || 'Registration failed. Please try again.');
      if (result?.requiresVerification) {
        setPendingVerificationEmail(result.email || email.trim());
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
            Centralize your family medical records safely.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.975rem', lineHeight: '1.6' }}>
            Create an account to securely organize lab test results, clinical prescriptions, and historical healthcare consultation records with verified access.
          </p>
        </div>
      </div>

      {/* Right side: Register form */}
      <div className="auth-form-side">
        <div className="auth-form-wrapper">
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Get started with your free HealthVault workspace
          </p>

          {error && (
            <div className="alert alert-error" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>{error}</div>
              {pendingVerificationEmail && (
                <Link
                  to={`/verify-email?email=${encodeURIComponent(pendingVerificationEmail)}`}
                  style={{ color: 'var(--accent-primary)', fontWeight: '600', fontSize: '0.85rem' }}
                >
                  Go to Email Verification Page &rarr;
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                className="form-input"
                placeholder="Dr. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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
              <label className="form-label" htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.5rem' }} disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
