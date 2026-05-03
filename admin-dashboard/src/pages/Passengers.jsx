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
      .then(res => setUsers((res.users || []).filter(u => u.role !== 'admin' && u.role !== 'driver')))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    !search || (u.name || '').toLowerCase().includes(search.toLowerCase()) || (u.phone || '').includes(search)
  );

  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete this user record? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
    } catch (e) {
      alert('Failed to delete user: ' + e.message);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Passengers</h2>
          <p className="page-sub">{filtered.length} registered passengers</p>
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
                <tr><th>Name</th><th>Phone</th><th>Email</th><th>Gender</th><th>Pink Pass</th><th>Joined</th><th>Actions</th></tr>
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
                    <td>
                      <button 
                        onClick={() => deleteUser(u._id)}
                        style={{ 
                          background: '#fff0f0', 
                          color: '#e74c3c', 
                          border: '1px solid #ffcccc',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </td>
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
