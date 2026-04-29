import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep]     = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone]   = useState('');
  const [otp, setOtp]       = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) return setError('Enter your phone number');
    setLoading(true);
    try {
      const res = await sendOtp(phone.trim());
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length < 5) return setError('Enter the 5-digit OTP');
    setLoading(true);
    try {
      await verifyOtp(phone.trim(), otp.trim());
    } catch (err) {
      setError(err.message);
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
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
        <div className="login-stats">
          <div className="ls-item"><span className="ls-num">284</span><span className="ls-label">Rides Today</span></div>
          <div className="ls-item"><span className="ls-num">47</span><span className="ls-label">Active Drivers</span></div>
          <div className="ls-item"><span className="ls-num">1,284</span><span className="ls-label">Passengers</span></div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="lc-header">
            <div className="lc-icon">🔐</div>
            <h2>Admin Sign In</h2>
            <p>Authorized personnel only</p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="lc-form">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="+92 300 000 0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoFocus
              />
              {error && <div className="lc-error">⚠ {error}</div>}
              <button type="submit" className="lc-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="lc-form">
              <label>Verification Code</label>
              <p className="lc-hint">Sent to <strong>{phone}</strong></p>
              {devOtp && (
                <div className="lc-dev-banner" onClick={() => setOtp(devOtp)}>
                  <span>DEV OTP</span>
                  <strong>{devOtp}</strong>
                  <span className="lc-tap">tap to fill</span>
                </div>
              )}
              <input
                type="text"
                placeholder="Enter 5-digit OTP"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 5))}
                maxLength={5}
                autoFocus
              />
              {error && <div className="lc-error">⚠ {error}</div>}
              <button type="submit" className="lc-btn" disabled={loading}>
                {loading ? 'Verifying...' : 'Sign In to Admin Panel →'}
              </button>
              <button type="button" className="lc-back" onClick={() => { setStep('phone'); setError(''); setOtp(''); }}>
                ← Change number
              </button>
            </form>
          )}

          <div className="lc-note">
            🔒 Access restricted to admin accounts only
          </div>
        </div>
      </div>
    </div>
  );
}
