import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';
import './TablePage.css';

const sevColor = { critical: '#e74c3c', high: '#e67e22', medium: '#f39c12', low: '#3498db' };
const statusColor = { active: '#e74c3c', handling: '#3498db', resolved: '#27ae60' };

export default function SosAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState('');
  const [liveCount, setLiveCount] = useState(0);
  const socketRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const load = () => {
    setLoading(true);
    api.get('/admin/alerts/all')
      .then(res => setAlerts(res.alerts || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();

    // Connect Socket.io for real-time SOS alerts
    const SOCKET_URL = window.location.hostname === 'localhost'
      ? 'http://localhost:5000'
      : 'https://safora-production-f5ce.up.railway.app';
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => console.log('[Admin] Socket connected'));

    socket.on('safety-alert', (data) => {
      setLiveCount(c => c + 1);
      const newAlert = {
        _id: data.alertId,
        type: data.type,
        severity: data.severity,
        description: data.message || `Emergency ${data.type} alert`,
        status: 'active',
        createdAt: data.timestamp || new Date().toISOString(),
        passenger: data.passenger || { name: 'Passenger', phone: '—' },
      };
      setAlerts(prev => [newAlert, ...prev]);
      showToast(`🚨 New ${data.severity?.toUpperCase()} alert: ${data.type}`);
    });

    socket.on('alert-resolved', ({ alertId }) => {
      setAlerts(prev => prev.map(a => a._id === alertId ? { ...a, status: 'resolved' } : a));
    });

    return () => socket.disconnect();
  }, []);

  const resolve = async (alertId) => {
    try {
      await api.patch(`/safety/alerts/${alertId}/resolve`, { notes: 'Resolved by admin' });
      setAlerts(prev => prev.map(a => a._id === alertId ? { ...a, status: 'resolved' } : a));
      showToast('Alert resolved');
    } catch {
      showToast('Failed to resolve alert');
    }
  };

  const timeAgo = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  const deleteAlert = async (id) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;
    try {
      await api.delete(`/admin/alerts/${id}`);
      setAlerts(prev => prev.filter(a => a._id !== id));
      showToast('Alert deleted');
    } catch {
      showToast('Failed to delete alert');
    }
  };

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.status === filter || a.severity === filter);

  return (
    <div className="page">
      {toast && <div className="toast">{toast}</div>}

      <div className="page-head">
        <div>
          <h2 className="page-title">
            SOS Alerts
            {liveCount > 0 && (
              <span style={{ marginLeft: 10, background: '#e74c3c', color: '#fff', borderRadius: 12, padding: '2px 9px', fontSize: 12, fontWeight: 700 }}>
                {liveCount} new
              </span>
            )}
          </h2>
          <p className="page-sub">Live safety alerts from passengers — updates in real-time</p>
        </div>
        <button className="btn-refresh" onClick={() => { load(); setLiveCount(0); }}>↻ Refresh</button>
      </div>

      <div className="filter-tabs">
        {['all', 'active', 'handling', 'resolved'].map(f => (
          <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'active' && alerts.filter(a => a.status === 'active').length > 0 && (
              <span style={{ marginLeft: 5, background: '#e74c3c', color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 10, fontWeight: 700 }}>
                {alerts.filter(a => a.status === 'active').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-box">Loading alerts...</div> : (
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="es-icon">🛡️</div>
            <div className="es-title">All clear!</div>
            <div className="es-sub">No SOS alerts matching this filter</div>
          </div>
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Passenger</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a._id} style={a.status === 'active' ? { background: '#fff5f5' } : {}}>
                    <td>
                      <div className="cell-user">
                        <div className="cu-avatar">{String(a.passenger?.name || 'P').charAt(0)}</div>
                        <div>
                          <div>{a.passenger?.name || 'Unknown'}</div>
                          {a.passenger?.phone && <div style={{ fontSize: 11, color: '#888' }}>{a.passenger.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="type-chip">{a.type || 'sos'}</span></td>
                    <td>
                      <span className="sev-dot" style={{ background: sevColor[a.severity] || '#888' }} />
                      <span style={{ color: sevColor[a.severity] || '#888', fontWeight: 700, fontSize: 12 }}>
                        {a.severity || '—'}
                      </span>
                    </td>
                    <td className="td-trunc">{a.description || '—'}</td>
                    <td className="td-time">{timeAgo(a.createdAt)}</td>
                    <td>
                      <span className="status-chip" style={{ color: statusColor[a.status] || '#888', background: (statusColor[a.status] || '#888') + '18' }}>
                        {a.status || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {a.status === 'active' && (
                          <button
                            onClick={() => resolve(a._id)}
                            style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}
                          >
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => deleteAlert(a._id)}
                          style={{ background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
