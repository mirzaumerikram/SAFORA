import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './TablePage.css';

const chipStyle = {
  started:   { bg: '#eafbea', color: '#27ae60' },
  accepted:  { bg: '#e8f4fd', color: '#3498db' },
  matched:   { bg: '#fef9e7', color: '#f39c12' },
  completed: { bg: '#f4f4f4', color: '#888' },
  cancelled: { bg: '#fff0f0', color: '#e74c3c' },
};

export default function Rides() {
  const [rides, setRides]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    api.get('/admin/rides/active')
      .then(res => setRides(res.rides || []))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rides.filter(r =>
    !search ||
    (r.passenger?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.pickupLocation?.address || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Active Rides</h2>
          <p className="page-sub">{rides.length} rides currently in progress</p>
        </div>
        <div className="search-inline">
          <span>🔍</span>
          <input placeholder="Search passenger or location..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <div className="loading-box">Loading rides...</div> : (
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="es-icon">🚗</div>
            <div className="es-title">No active rides</div>
            <div className="es-sub">Live rides will appear here as passengers book</div>
          </div>
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr><th>Passenger</th><th>Pickup</th><th>Dropoff</th><th>Type</th><th>Fare</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const cs = chipStyle[r.status] || { bg: '#f4f4f4', color: '#888' };
                  return (
                    <tr key={r._id}>
                      <td>
                        <div className="cell-user">
                          <div className="cu-avatar">{(r.passenger?.name || 'P').charAt(0)}</div>
                          <div>
                            <div>{r.passenger?.name || '—'}</div>
                            <div style={{ fontSize: 11, color: '#aaa' }}>{r.passenger?.phone || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td-trunc">{r.pickupLocation?.address || '—'}</td>
                      <td className="td-trunc">{r.dropoffLocation?.address || '—'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{r.type || 'standard'}</td>
                      <td style={{ fontWeight: 700 }}>RS {r.fare?.estimated ?? '—'}</td>
                      <td>
                        <span className="status-chip" style={{ background: cs.bg, color: cs.color }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
