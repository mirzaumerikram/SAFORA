import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();

  const [step,      setStep]      = useState('phone'); // 'phone' | 'otp'
  const [phone,     setPhone]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [emailHint, setEmailHint] = useState('');   // e.g. "ad***@safora.pk"
  const [devOtp,    setDevOtp]    = useState('');   // only in development
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [attempts,  setAttempts]  = useState(0);    // simple brute-force guard

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleaned = phone.replace(/\s/g, '');
    if (!cleaned) return setError('Enter your registered admin phone number');

    setLoading(true);
    try {
      const res = await sendOtp(cleaned);
      if (res.emailHint) setEmailHint(res.emailHint);
      if (res.devOtp)    setDevOtp(res.devOtp);
      // Always move to OTP step — email errors are non-fatal, code is on screen
      setStep('otp');
    } catch (err) {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length < 5) return setError('Enter the full 5-digit code');

    if (attempts >= 5) {
      setError('Too many failed attempts. Please request a new OTP.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(phone.replace(/\s/g, ''), otp.trim());
      // AuthContext.verifyOtp sets admin state → App re-renders to Dashboard
    } catch (err) {
      setAttempts(a => a + 1);
      setError(err.message || 'Incorrect code. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const handleBack = () => {
    setStep('phone');
    setError('');
    setOtp('');
    setEmailHint('');
    setDevOtp('');
    setAttempts(0);
  };

  const otpDeliveryMsg = emailHint
    ? `A secure code was sent to ${emailHint}`
    : `A verification code was sent to ${phone}`;

  return (
    <div className="login-root">

      {/* ── Left panel ── */}
      <div className="login-left">
        <div className="login-brand">
          <span className="brand-icon">🛡️</span>
          <div>
            <div className="brand-name">SAFORA</div>
            <div className="brand-sub">Admin Control Panel</div>
          </div>
        </div>

        <div className="login-tagline">
          <h1>Safety First.<br />Always.</h1>
          <p>
            Monitor rides, approve drivers, manage SOS alerts and keep every
            passenger safe — all from one place.
          </p>
        </div>

        {/* Security badges */}
        <div className="login-security-badges">
          <div className="sec-badge">🔐 2-Factor Authentication</div>
          <div className="sec-badge">📧 OTP via Secure Email</div>
          <div className="sec-badge">🛡️ Admin Role Verified</div>
        </div>

        <div className="login-stats">
          <div className="ls-item">
            <span className="ls-num">284</span>
            <span className="ls-label">Rides Today</span>
          </div>
          <div className="ls-item">
            <span className="ls-num">47</span>
            <span className="ls-label">Active Drivers</span>
          </div>
          <div className="ls-item">
            <span className="ls-num">1,284</span>
            <span className="ls-label">Passengers</span>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="login-right">
        <div className="login-card">

          <div className="lc-header">
            <div className="lc-icon">{step === 'phone' ? '🔐' : '📧'}</div>
            <h2>Admin Sign In</h2>
            <p>Authorised personnel only</p>
          </div>

          {/* ── Phone step ── */}
          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="lc-form">
              <label>Phone Number</label>
              <p className="lc-field-hint">
                Enter your registered admin phone number
              </p>
              <input
                type="tel"
                placeholder="+92 300 000 0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoFocus
                disabled={loading}
              />
              {error && <div className="lc-error">⚠ {error}</div>}
              <button type="submit" className="lc-btn" disabled={loading}>
                {loading ? (
                  <span className="lc-spinner">Sending secure code…</span>
                ) : (
                  'Send OTP →'
                )}
              </button>
              <div className="lc-note">
                🔒 OTP is sent to your registered email address
              </div>
            </form>
          )}

          {/* ── OTP step ── */}
          {step === 'otp' && (
            <form onSubmit={handleVerify} className="lc-form">
              <label>Verification Code</label>

              {/* Delivery hint */}
              <div className="lc-delivery-hint">
                <span className="lc-delivery-icon">
                  {emailHint ? '📧' : '📱'}
                </span>
                <span>{otpDeliveryMsg}</span>
              </div>

              {/* Dev OTP banner — only visible in development */}
              {devOtp && (
                <div
                  className="lc-dev-banner"
                  onClick={() => setOtp(devOtp)}
                  title="Click to autofill (development only)"
                >
                  <span className="lc-dev-label">DEV MODE</span>
                  <strong className="lc-dev-code">{devOtp}</strong>
                  <span className="lc-tap">tap to fill</span>
                </div>
              )}

              {/* OTP digit input */}
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter 5-digit code"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 5))}
                maxLength={5}
                autoFocus
                disabled={loading}
                className="lc-otp-input"
              />

              {attempts > 0 && (
                <div className="lc-attempts">
                  {5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} remaining
                </div>
              )}

              {error && <div className="lc-error">⚠ {error}</div>}

              <button
                type="submit"
                className="lc-btn"
                disabled={loading || otp.length < 5}
              >
                {loading ? (
                  <span className="lc-spinner">Verifying…</span>
                ) : (
                  'Sign In to Admin Panel →'
                )}
              </button>

              <button
                type="button"
                className="lc-back"
                onClick={handleBack}
                disabled={loading}
              >
                ← Change number
              </button>
            </form>
          )}

          <div className="lc-note lc-note-bottom">
            🔒 Access restricted to admin accounts only
          </div>

        </div>
      </div>
    </div>
  );
}
