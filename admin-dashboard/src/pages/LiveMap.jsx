import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './TablePage.css';

export default function LiveMap() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setStats(r.stats)).catch(() => {});
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Live Map</h2>
          <p className="page-sub">Real-time driver and ride positions</p>
        </div>
        {stats && (
          <div style={{ display:'flex', gap:10 }}>
            <div className="badge-count">{stats.activeDrivers} Drivers Online</div>
            <div className="badge-count" style={{ background:'#e8f4fd', color:'#3498db' }}>{stats.activeRides} Active Rides</div>
          </div>
        )}
      </div>
      <div className="map-full-card">
        <iframe
          title="Full Live Map"
          src="https://maps.google.com/maps?q=31.5204,74.3587&z=12&output=embed&hl=en"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
      <div className="map-legend">
        <div className="ml-item"><span className="ml-dot" style={{ background:'#27ae60' }} />Active Drivers</div>
        <div className="ml-item"><span className="ml-dot" style={{ background:'#3498db' }} />Passengers</div>
        <div className="ml-item"><span className="ml-dot" style={{ background:'#e74c3c' }} />SOS Alert</div>
        <div className="ml-item"><span className="ml-dot" style={{ background:'#f39c12' }} />Pickup Point</div>
      </div>
    </div>
  );
}
