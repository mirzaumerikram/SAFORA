import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
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
  const { search }            = useOutletContext();
  const [rides, setRides]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('active'); // 'active' or 'completed'

  useEffect(() => {
    setLoading(true);
    const endpoint = tab === 'active' ? '/admin/rides/active' : '/admin/rides/completed';
    api.get(endpoint)
      .then(res => setRides(res.rides || []))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const filtered = rides.filter(r =>
    !search ||
    (r.passenger?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.driver?.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.pickupLocation?.address || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.dropoffLocation?.address || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">{tab === 'active' ? 'Active Rides' : 'Ride History'}</h2>
          <p className="page-sub">{rides.length} rides {tab === 'active' ? 'currently in progress' : 'found in history'}</p>
        </div>
        <div className="tab-container">
          <button 
            className={`tab-btn ${tab === 'active' ? 'active' : ''}`}
            onClick={() => setTab('active')}
          >
            🔄 Active
          </button>
          <button 
            className={`tab-btn ${tab === 'completed' ? 'active' : ''}`}
            onClick={() => setTab('completed')}
          >
            📋 Completed
          </button>
        </div>
      </div>

      {loading ? <div className="loading-box">Loading rides...</div> : (
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="es-icon">{tab === 'active' ? '🚗' : '🏁'}</div>
            <div className="es-title">No {tab} rides</div>
            <div className="es-sub">Data will appear here as the system processes trips</div>
          </div>
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Passenger</th>
                  <th>Driver</th>
                  <th>Pickup</th>
                  <th>Dropoff</th>
                  <th>Type</th>
                  <th>Fare</th>
                  <th>Status</th>
                </tr>
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
                      <td>
                        {r.driver?.user ? (
                           <div className="cell-user">
                            <div className="cu-avatar" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                              {(r.driver.user.name || 'D').charAt(0)}
                            </div>
                            <div>
                              <div>{r.driver.user.name}</div>
                              <div style={{ fontSize: 11, color: '#aaa' }}>{r.driver.user.phone}</div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#aaa', fontSize: 13 }}>Not Assigned</span>
                        )}
                      </td>
                      <td className="td-trunc">{r.pickupLocation?.address || '—'}</td>
                      <td className="td-trunc">{r.dropoffLocation?.address || '—'}</td>
                      <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{r.type || 'standard'}</td>
                      <td style={{ fontWeight: 700 }}>RS {r.estimatedPrice || '—'}</td>
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
