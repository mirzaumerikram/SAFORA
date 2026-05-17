import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Removing hoisted import 'leaflet.heat'; to prevent crash
import { api } from '../services/api';
import './TablePage.css';

// Fix Leaflet's default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Heatmap Layer Component
const HeatmapLayer = ({ points }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    // leaflet.heat is loaded globally via CDN in index.html
    // Use window.L.heatLayer directly — no dynamic import needed
    if (typeof window.L === 'undefined' || typeof window.L.heatLayer === 'undefined') {
      console.warn('leaflet.heat not yet loaded from CDN');
      return;
    }

    // Remove existing layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    heatLayerRef.current = window.L.heatLayer(points, {
      radius: 35,
      blur: 25,
      maxZoom: 14,
      gradient: { 0.1: 'blue', 0.3: 'cyan', 0.5: 'lime', 0.7: 'yellow', 0.9: 'red' }
    }).addTo(map);

    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, points]);

  return null;
};

export default function LiveMap() {
  const [stats, setStats] = useState(null);
  const [heatmapPoints, setHeatmapPoints] = useState([]);

  useEffect(() => {
    // Fetch stats
    api.get('/admin/dashboard').then(r => setStats(r.stats)).catch(() => {});
    
    // Fetch heatmap data
    api.get('/admin/heatmap-data').then(r => {
      if (r.success) {
        // FILTER INVALID COORDINATES: 
        // Leaflet will crash instantly if we pass [NaN, NaN] or undefined.
        const validPoints = (r.points || []).filter(p => 
          Array.isArray(p) && 
          p.length >= 2 && 
          typeof p[0] === 'number' && !isNaN(p[0]) &&
          typeof p[1] === 'number' && !isNaN(p[1])
        );
        setHeatmapPoints(validPoints);
      }
    }).catch(e => console.error("Failed to load heatmap data:", e));
  }, []);

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="page-head">
        <div>
          <h2 className="page-title">Live Demand Heatmap</h2>
          <p className="page-sub">Real-time ride hotspots visualized using geospatial density</p>
        </div>
        {stats && (
          <div style={{ display:'flex', gap:10 }}>
            <div className="badge-count">{stats.activeDrivers} Drivers Online</div>
            <div className="badge-count" style={{ background:'#e8f4fd', color:'#3498db' }}>{stats.activeRides} Active Rides</div>
          </div>
        )}
      </div>
      
      <div className="map-full-card" style={{ flex: 1, minHeight: '600px', margin: '20px', borderRadius: '12px', overflow: 'hidden' }}>
        <MapContainer 
          center={[31.5204, 74.3587]} // Lahore
          zoom={12} 
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark theme to make heat pop
          />
          <HeatmapLayer points={heatmapPoints} />
        </MapContainer>
      </div>
      
      <div className="map-legend" style={{ margin: '0 20px 20px' }}>
        <div className="ml-item"><span className="ml-dot" style={{ background:'red' }} />High Demand (Hotspot)</div>
        <div className="ml-item"><span className="ml-dot" style={{ background:'yellow' }} />Medium Demand</div>
        <div className="ml-item"><span className="ml-dot" style={{ background:'blue' }} />Low Demand</div>
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#666' }}>
          *Heatmap uses actual passenger pickup coordinates
        </div>
      </div>
    </div>
  );
}
