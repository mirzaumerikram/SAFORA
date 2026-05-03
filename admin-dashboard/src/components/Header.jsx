import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import './Header.css';

const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Header({ search, setSearch }) {
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(false);
  const dropdownRef = useRef(null);
  const now = new Date();
  const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} · Lahore, Pakistan`;

  const fetchNotifs = async () => {
    try {
      const [alertsRes, driversRes] = await Promise.all([
        api.get('/admin/alerts/active'),
        api.get('/admin/drivers/pending')
      ]);
      
      const combined = [
        ...(alertsRes.alerts || []).map(a => ({
          id: a._id,
          type: 'sos',
          title: '🚨 SOS Alert',
          desc: `${a.passenger?.name || 'Unknown'} triggered an emergency`,
          time: a.createdAt,
          link: '/sos-alerts'
        })),
        ...(driversRes.drivers || []).map(d => ({
          id: d._id,
          type: 'driver',
          title: '🚖 New Driver Application',
          desc: `${d.user?.name || 'Unknown'} is waiting for approval`,
          time: d.createdAt,
          link: '/drivers'
        }))
      ].sort((a, b) => new Date(b.time) - new Date(a.time));
      
      setNotifs(combined.slice(0, 10));
      setUnread(combined.length > 0);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-date">{dateStr}</p>
      </div>
      <div className="header-right">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search ride, driver, user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="notif-container" ref={dropdownRef}>
          <button className="notif-btn" onClick={() => { setShowNotifs(!showNotifs); setUnread(false); }}>
            🔔
            {unread && <span className="notif-dot" />}
          </button>
          
          {showNotifs && (
            <div className="notif-dropdown">
              <div className="nd-header">
                <h4>Notifications</h4>
                {notifs.length > 0 && <span style={{fontSize:11, color:'#aaa'}}>{notifs.length} new</span>}
              </div>
              <div className="nd-list">
                {notifs.length === 0 ? (
                  <div className="nd-empty">No new notifications</div>
                ) : (
                  notifs.map(n => (
                    <Link to={n.link} key={n.id} className="nd-item" onClick={() => setShowNotifs(false)}>
                      <div className="nd-icon" style={{ background: n.type === 'sos' ? '#fff0f0' : '#e8f4fd' }}>
                        {n.type === 'sos' ? '🚨' : '🚖'}
                      </div>
                      <div className="nd-info">
                        <div className="nd-title">{n.title}</div>
                        <div className="nd-desc">{n.desc}</div>
                        <div className="nd-time">{new Date(n.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              <div className="nd-footer">
                <Link to="/sos-alerts" onClick={() => setShowNotifs(false)}>View all activity</Link>
              </div>
            </div>
          )}
        </div>

        <div className="live-badge">● LIVE</div>
      </div>
    </header>
  );
}
