import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

export default function Layout() {
  const [search, setSearch] = useState('');
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <Header search={search} setSearch={setSearch} />
        <div className="layout-content">
          <Outlet context={{ search }} />
        </div>
      </div>
    </div>
  );
}
