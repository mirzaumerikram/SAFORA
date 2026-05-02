import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import './Dashboard.css';

const StatCard = ({ icon, value, label, color }) => (
  <div className="stat-card">
    <div className="sc-top">
      <div className="sc-icon" style={{ background: color + '18' }}>{icon}</div>
    </div>
    <div className="sc-value">{value ?? 0}</div>
    <div className="sc-label">{label}</div>
  </div>
);

const statusColor = { active: '#e74c3c', handling: '#3498db', resolved: '#27ae60' };
const statusLabel = { active: '● Active', handling: '● Handling', resolved: '✓ Resolved' };

export default function Dashboard() {
  const [stats, setStats]         = useState(null);
  const [alerts, setAlerts]       = useState([]);
  const [rides, setRides]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    Promise.allSettled([
      api.get('/admin/dashboard'),
      api.get('/admin/alerts/active'),
      api.get('/admin/rides/active'),
    ]).then(([statsRes, alertsRes, ridesRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.stats);
      else setError('Backend offline — showing demo data');
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.alerts || []);
      if (ridesRes.status === 'fulfilled') setRides(ridesRes.value.rides || []);
    }).finally(() => setLoading(false));
  }, []);

  // Zero state when backend has no data yet
  const s = stats || { totalRides: 0, activeDrivers: 0, openAlerts: 0, totalUsers: 0, activeRides: 0, pendingDriverApprovals: 0 };
  const displayAlerts = alerts.slice(0, 5);

  const timeAgo = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff} min ago`;
    return `${Math.floor(diff / 60)} hr ago`;
  };

  if (loading) return <div className="dash-loading">Loading dashboard...</div>;

  return (
    <div className="dashboard">
      {error && <div className="dash-offline">⚠ {error}</div>}

      {/* Stat cards */}
      <div className="stats-row">
        <StatCard icon="🚗" value={s.totalRides}              label="TOTAL RIDES TODAY"     change={null} color="#3498db" />
        <StatCard icon="🟢" value={s.activeDrivers}           label="ACTIVE DRIVERS"        change={null} color="#27ae60" />
        <StatCard icon="🚨" value={s.openAlerts}              label="SOS ALERTS TODAY"      change={null} color="#e74c3c" />
        <StatCard icon="👥" value={s.totalUsers}              label="REGISTERED PASSENGERS" change={null} color="#9b59b6" />
      </div>

      {/* Map + SOS row */}
      <div className="mid-row">
        {/* Live Map */}
        <div className="map-card">
          <div className="card-header">
            <div className="ch-title">🗺️ Live Map — Lahore</div>
            <Link to="/live-map" className="ch-link">Open Full Map →</Link>
          </div>
          <div className="map-embed-wrap">
            <iframe
              title="Live Map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=74.2500,31.4200,74.5000,31.6500&layer=mapnik"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
            />
            <div className="map-overlay-stats">
              <div className="mos-item mos-drivers">🚗 {s.activeDrivers} Active Drivers</div>
              <div className="mos-item mos-rides">🔄 {s.activeRides ?? 63} Active Rides</div>
              {s.openAlerts > 0 && <div className="mos-item mos-sos">🚨 {s.openAlerts} SOS Active</div>}
            </div>
          </div>
        </div>

        {/* SOS Alerts */}
        <div className="sos-card">
          <div className="card-header">
            <div className="ch-title">🚨 SOS Alerts</div>
            <Link to="/sos-alerts" className="ch-link">View All →</Link>
          </div>
          <div className="sos-table-head">
            <span>PASSENGER</span>
            <span>LOCATION</span>
            <span>STATUS</span>
          </div>
          <div className="sos-rows">
            {displayAlerts.map(a => (
              <div className="sos-row" key={a._id}>
                <div className="sos-passenger">
                  <div className="sos-avatar">{(a.passenger?.name || 'P').charAt(0)}</div>
                  <div>
                    <div className="sos-name">{a.passenger?.name || 'Unknown'}</div>
                    <div className="sos-time">{timeAgo(a.createdAt)}</div>
                  </div>
                </div>
                <div className="sos-loc">{a.location || a.pickupLocation?.address || '—'}</div>
                <div className="sos-status" style={{ color: statusColor[a.status] || '#888' }}>
                  {statusLabel[a.status] || a.status}
                </div>
              </div>
            ))}
            {displayAlerts.length === 0 && (
              <div className="sos-empty">🛡️ No active SOS alerts — all clear</div>
            )}
          </div>
        </div>
      </div>

      {/* Active Rides */}
      <div className="section-card">
        <div className="card-header">
          <div className="ch-title">🔄 Active Rides ({rides.length || s.activeRides})</div>
          <Link to="/rides" className="ch-link">View All →</Link>
        </div>
        {rides.length === 0 ? (
          <div className="empty-hint">No live data — start the backend to see real rides.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Passenger</th><th>Pickup</th><th>Dropoff</th><th>Fare</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rides.slice(0, 6).map(r => (
                <tr key={r._id}>
                  <td>{r.passenger?.name || '—'}</td>
                  <td className="td-trunc">{r.pickupLocation?.address || '—'}</td>
                  <td className="td-trunc">{r.dropoffLocation?.address || '—'}</td>
                  <td>RS {r.fare?.estimated ?? '—'}</td>
                  <td><span className={`status-chip chip-${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
