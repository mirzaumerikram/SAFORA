import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './TablePage.css';

export default function SafetyReports() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    Promise.allSettled([
      api.get('/admin/dashboard'),
      api.get('/admin/alerts/active'),
    ]).then(([sr, ar]) => {
      if (sr.status === 'fulfilled') setStats(sr.value.stats);
      if (ar.status === 'fulfilled') setAlerts(ar.value.alerts || []);
    });
  }, []);

  const s = stats || { openAlerts: 0, activeRides: 0, totalRides: 0 };
  const resolved = alerts.filter(a => a.status === 'resolved').length;
  const active   = alerts.filter(a => a.status === 'active').length;

  const reportCards = [
    { icon: '🚨', label: 'Total Open Alerts',      value: s.openAlerts,  color: '#e74c3c' },
    { icon: '✅', label: 'Resolved Today',          value: resolved,      color: '#27ae60' },
    { icon: '🔄', label: 'Currently Active',        value: active,        color: '#3498db' },
    { icon: '🛡️', label: 'Safety Score',            value: '94%',         color: '#9b59b6' },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Safety Reports</h2>
          <p className="page-sub">Platform safety overview and incident analysis</p>
        </div>
      </div>

      <div className="report-grid">
        {reportCards.map(c => (
          <div className="report-card" key={c.label}>
            <div className="rc-icon" style={{ background: c.color + '18' }}>{c.icon}</div>
            <div className="rc-value" style={{ color: c.color }}>{c.value}</div>
            <div className="rc-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="table-card" style={{ marginTop: 24 }}>
        <div className="card-header" style={{ padding: '16px 20px 0' }}>
          <div className="ch-title">Recent Alerts Log</div>
        </div>
        {alerts.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="es-icon">🛡️</div>
            <div className="es-title">No alerts recorded</div>
            <div className="es-sub">All safety alerts will appear here</div>
          </div>
        ) : (
          <table className="data-table" style={{ marginTop: 16 }}>
            <thead>
              <tr><th>Type</th><th>Severity</th><th>Description</th><th>Status</th><th>Time</th></tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a._id}>
                  <td><span className="type-chip">{a.type || 'sos'}</span></td>
                  <td style={{ textTransform: 'capitalize', fontWeight: 700, color: a.severity === 'critical' ? '#e74c3c' : '#f39c12' }}>
                    {a.severity || '—'}
                  </td>
                  <td className="td-trunc">{a.description || '—'}</td>
                  <td><span className="status-chip" style={{ color: a.status === 'active' ? '#e74c3c' : a.status === 'resolved' ? '#27ae60' : '#3498db', background: 'transparent', border: '1px solid currentColor' }}>{a.status}</span></td>
                  <td className="td-time">{a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
