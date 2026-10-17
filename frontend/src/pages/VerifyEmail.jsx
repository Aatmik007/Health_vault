import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  const { verifyEmail, resendVerification } = useContext(AuthContext);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  // 60-second cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  const handleOtpChange = (e) => {
    // Only allow numbers and max 6 digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    if (error) setError('');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }

    if (otp.length !== 6) {
      setError('Please enter a complete 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    const result = await verifyEmail(email.trim(), otp);
    setIsVerifying(false);

    if (result.success) {
      setSuccessMsg(result.message || 'Email successfully verified! Redirecting to dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } else {
      setError(result.message || 'Verification failed. Please check the code.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Please specify your email address to resend the code.');
      return;
    }

    setIsResending(true);
    const result = await resendVerification(email.trim());
    setIsResending(false);

    if (result.success) {
      setSuccessMsg(result.message || 'A new verification code has been dispatched.');
      setCooldown(60);
    } else {
      setError(result.message || 'Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="auth-page-container">
      {/* Left side: Brand overview */}
      <div className="auth-brand-side">
        <div style={{ maxWidth: '440px' }}>
          <div className="brand-logo" style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>
            <span>HealthVault</span>
            <span className="brand-badge" style={{ fontSize: '0.8rem' }}>Security</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', lineHeight: '1.2', marginBottom: '1rem' }}>
            Protecting your sensitive medical records.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.975rem', lineHeight: '1.6' }}>
            Two-step identity confirmation ensures all medical records, laboratory analysis, and healthcare timelines remain private and accessible only by you.
          </p>
        </div>
      </div>

      {/* Right side: Verification form */}
      <div className="auth-form-side">
        <div className="auth-form-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>✉️</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Verify Email</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Enter the 6-digit verification code sent to your email address to activate your HealthVault account.
          </p>

          {error && <div className="alert alert-error">{error}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label className="form-label" htmlFor="verify-email">Email Address</label>
              <input
                type="email"
                id="verify-email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="otp-input">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                id="otp-input"
                className="form-input"
                placeholder="123456"
                value={otp}
                onChange={handleOtpChange}
                maxLength={6}
                autoComplete="one-time-code"
                style={{
                  fontSize: '1.5rem',
                  letterSpacing: '0.35em',
                  textAlign: 'center',
                  fontWeight: '700',
                  color: 'var(--accent-primary)',
                  padding: '0.75rem',
                }}
                required
              />
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                Expires in 10 minutes.
              </span>
            </div>

            <button
              type="submit"
              className="btn"
              style={{ width: '100%', marginTop: '0.75rem' }}
              disabled={isVerifying || otp.length !== 6}
            >
              {isVerifying ? 'Verifying Code...' : 'Verify & Continue'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Didn't receive the email?
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              style={{
                background: 'none',
                border: 'none',
                color: cooldown > 0 ? 'var(--text-muted)' : 'var(--accent-primary)',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                textDecoration: cooldown > 0 ? 'none' : 'underline',
              }}
            >
              {isResending
                ? 'Sending Code...'
                : cooldown > 0
                ? `Resend Code in ${cooldown}s`
                : 'Resend Verification Code'}
            </button>
          </div>

          <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Back to{' '}
            <Link to="/login" style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
              Sign In
            </Link>
            {' • '}
            <Link to="/register" style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
