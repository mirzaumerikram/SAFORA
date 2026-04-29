import React from 'react';
import './Header.css';

const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Header({ search, setSearch }) {
  const now = new Date();
  const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} · Sialkot, Pakistan`;

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
        <button className="notif-btn">
          🔔
          <span className="notif-dot" />
        </button>
        <div className="live-badge">● LIVE</div>
      </div>
    </header>
  );
}
