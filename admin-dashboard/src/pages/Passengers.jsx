import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import './TablePage.css';

export default function Passengers() {
  const { search }            = useOutletContext();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/users')
      .then(res => setUsers((res.users || []).filter(u => u.role === 'passenger' || !u.role)))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    !search || (u.name || '').toLowerCase().includes(search.toLowerCase()) || (u.phone || '').includes(search)
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Passengers</h2>
          <p className="page-sub">{users.length} registered passengers</p>
        </div>
      </div>

      {loading ? <div className="loading-box">Loading passengers...</div> : (
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="es-icon">👥</div>
            <div className="es-title">{search ? 'No results' : 'No passengers yet'}</div>
            <div className="es-sub">{search ? `No match for "${search}"` : 'Passengers will appear here after they register'}</div>
          </div>
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Phone</th><th>Email</th><th>Gender</th><th>Pink Pass</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div className="cell-user">
                        <div className="cu-avatar">{(u.name || 'U').charAt(0).toUpperCase()}</div>
                        <span>{u.name || '—'}</span>
                      </div>
                    </td>
                    <td>{u.phone || '—'}</td>
                    <td className="td-trunc">{u.email || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{u.gender || '—'}</td>
                    <td>
                      {u.pinkPassVerified
                        ? <span className="badge-yes">✓ Verified</span>
                        : <span className="badge-no">Not verified</span>}
                    </td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
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
