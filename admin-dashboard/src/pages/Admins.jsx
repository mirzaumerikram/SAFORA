import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import './Admins.css';
import './TablePage.css';

export default function Admins() {
  const { search }              = useOutletContext();
  const [admins, setAdmins]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [newPhone, setNewPhone] = useState('');
  const [adding, setAdding]     = useState(false);
  const [toast, setToast]       = useState('');

  const load = () => {
    setLoading(true);
    api.get('/admin/list')
      .then(res => setAdmins(res.admins || []))
      .catch(() => setAdmins([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = admins.filter(a =>
    !search ||
    (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.phone || '').includes(search) ||
    (a.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const addAdmin = async (e) => {
    e.preventDefault();
    if (!newPhone) return;
    setAdding(true);
    try {
      await api.post('/admin/add', { phone: newPhone });
      setNewPhone('');
      showToast('✅ Admin added successfully');
      load();
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message));
    } finally {
      setAdding(false);
    }
  };

  const removeAdmin = async (id) => {
    if (!window.confirm('Are you sure you want to remove this admin? they will be demoted to passenger.')) return;
    try {
      await api.delete(`/admin/${id}`);
      showToast('Admin removed');
      load();
    } catch (err) {
      showToast('❌ ' + err.message);
    }
  };

  return (
    <div className="page">
      {toast && <div className="toast">{toast}</div>}

      <div className="page-head">
        <div>
          <h2 className="page-title">Admin Management</h2>
          <p className="page-sub">Add or remove system administrators</p>
        </div>
        <div className="badge-count">{filtered.length} Results</div>
      </div>

      <form className="admin-actions" onSubmit={addAdmin}>
        <input 
          className="admin-input" 
          placeholder="Enter phone (e.g. +923...)" 
          value={newPhone}
          onChange={e => setNewPhone(e.target.value)}
          required
        />
        <button className="btn-add-admin" type="submit" disabled={adding}>
          {adding ? 'Adding...' : '+ Add Admin'}
        </button>
        <p style={{fontSize:12, color:'#888', marginLeft:10}}>
          User must already have an account to be promoted.
        </p>
      </form>

      {loading ? <div className="loading-box">Loading admins...</div> : (
        <div className="admin-card">
          <table className="data-table">
            <thead>
              <tr><th>Admin Name</th><th>Phone</th><th>Email</th><th>Added On</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a._id}>
                  <td>
                    <div className="cell-user">
                      <div className="cu-avatar">{(a.name || 'A').charAt(0).toUpperCase()}</div>
                      <span>{a.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td>{a.phone}</td>
                  <td>{a.email || '—'}</td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-remove-admin" onClick={() => removeAdmin(a._id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
