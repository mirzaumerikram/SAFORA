import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();

  const [step,      setStep]      = useState('phone');
  const [phone,     setPhone]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  // ── Step 1: Request OTP ─────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    
    // Smart Format: remove spaces, fix prefixes
    let cleaned = phone.replace(/\s/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+92' + cleaned.slice(1);
    } else if (cleaned.startsWith('3') && cleaned.length === 10) {
      cleaned = '+92' + cleaned;
    }
    
    if (!cleaned) return setError('Please enter your phone number.');
    if (!cleaned.startsWith('+')) return setError('Please include your country code (e.g., +92).');

    setLoading(true);
    try {
      const res = await sendOtp(cleaned);
      setEmailHint(res.emailHint || '');
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP from email ──────────────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length < 5) return setError('Enter the 5-digit code from your email.');

    // Same Smart Format logic as Send
    let cleaned = phone.replace(/\s/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+92' + cleaned.slice(1);
    } else if (cleaned.startsWith('3') && cleaned.length === 10) {
      cleaned = '+92' + cleaned;
    }

    setLoading(true);
    try {
      await verifyOtp(cleaned, otp.trim());
    } catch (err) {
      setError(err.message || 'Incorrect code. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

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
          <p>Monitor rides, approve drivers, manage SOS alerts and keep every passenger safe — all from one place.</p>
        </div>

        <div className="login-security-badges">
          <div className="sec-badge">🔐 2-Factor Authentication</div>
          <div className="sec-badge">📧 OTP via Secure Email</div>
          <div className="sec-badge">🛡️ Admin Role Verified</div>
        </div>

        <div className="login-stats">
          <div className="ls-item"><span className="ls-num">284</span><span className="ls-label">Rides Today</span></div>
          <div className="ls-item"><span className="ls-num">47</span><span className="ls-label">Active Drivers</span></div>
          <div className="ls-item"><span className="ls-num">1,284</span><span className="ls-label">Passengers</span></div>
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

          {/* ── Step 1: Enter phone ── */}
          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="lc-form">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="+92 3XX XXXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoFocus
                disabled={loading}
              />
              {error && <div className="lc-error">⚠ {error}</div>}
              <button type="submit" className="lc-btn" disabled={loading || !phone.trim()}>
                {loading ? <span className="lc-spinner">Sending OTP to email…</span> : 'Send OTP →'}
              </button>
              <div className="lc-note">🔒 OTP will be sent to your registered email address</div>
            </form>
          )}

          {/* ── Step 2: Enter OTP from email ── */}
          {step === 'otp' && (
            <form onSubmit={handleVerify} className="lc-form">
              <label>Enter OTP from Email</label>

              {/* Email instruction */}
              <div className="lc-email-sent">
                <div className="lc-email-icon">📬</div>
                <div>
                  <strong>Check your email inbox</strong>
                  {emailHint && <p>OTP sent to <strong>{emailHint}</strong></p>}
                  <p className="lc-spam-note">Not in inbox? Check spam folder.</p>
                </div>
              </div>

              {/* OTP input */}
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

              {error && <div className="lc-error">⚠ {error}</div>}

              <button
                type="submit"
                className="lc-btn"
                disabled={loading || otp.length < 5}
              >
                {loading ? <span className="lc-spinner">Verifying…</span> : 'Sign In to Admin Panel →'}
              </button>

              <button type="button" className="lc-back" onClick={() => { setStep('phone'); setError(''); setOtp(''); }}>
                ← Change number
              </button>
            </form>
          )}

          <div className="lc-note lc-note-bottom">🔒 Access restricted to admin accounts only</div>
        </div>
      </div>
    </div>
  );
}
