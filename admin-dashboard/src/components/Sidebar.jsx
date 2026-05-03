import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './Sidebar.css';

const NavItem = ({ to, icon, label, badge }) => (
  <NavLink to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} end={to === '/'}>
    <span className="nav-icon">{icon}</span>
    <span className="nav-label">{label}</span>
    {badge > 0 && <span className="nav-badge">{badge}</span>}
  </NavLink>
);

export default function Sidebar() {
  const { admin, logout } = useAuth();
  const [pendingDrivers, setPendingDrivers] = useState(0);
  const [activeAlerts, setActiveAlerts]     = useState(0);

  useEffect(() => {
    api.get('/admin/dashboard').then(res => {
      setPendingDrivers(res.stats?.pendingDriverApprovals || 0);
      setActiveAlerts(res.stats?.openAlerts || 0);
    }).catch(() => {});
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sb-icon">🛡️</span>
        <div>
          <div className="sb-name">SAFORA</div>
          <div className="sb-sub">ADMIN CONTROL PANEL</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">MAIN</div>
        <NavItem to="/"         icon="📊" label="Dashboard" />
        <NavItem to="/live-map" icon="🗺️" label="Live Map" />
        <NavItem to="/rides"    icon="🚗" label="Rides" />

        <div className="nav-section-label">USERS</div>
        <NavItem to="/passengers" icon="👥" label="Passengers" />
        <NavItem to="/drivers"    icon="🚖" label="Drivers" badge={pendingDrivers} />

        <div className="nav-section-label">SAFETY</div>
        <NavItem to="/sos-alerts"     icon="🚨" label="SOS Alerts"     badge={activeAlerts} />
        <NavItem to="/safety-reports" icon="🛡️" label="Safety Reports" />
        
        <div className="nav-section-label">SYSTEM</div>
        <NavItem to="/admins" icon="🔐" label="Admins" />
      </nav>

      <div className="sidebar-footer">
        <div className="sf-user">
          <div className="sf-avatar">{admin?.name?.charAt(0)?.toUpperCase() || 'A'}</div>
          <div className="sf-info">
            <div className="sf-name">{admin?.name || 'Admin'}</div>
            <div className="sf-role">Administrator</div>
          </div>
        </div>
        <button className="sf-logout" onClick={logout} title="Sign out">⏻</button>
      </div>
    </aside>
  );
}
