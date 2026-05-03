import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import './TablePage.css';

export default function Passengers() {
  const { search }            = useOutletContext();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState('');
  const [action, setAction]   = useState(null);

  // Edit Modal State
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', cnic: '', gender: 'other' });
  const [formErrors, setFormErrors] = useState({});

  const load = () => {
    setLoading(true);
    api.get('/admin/users')
      .then(res => setUsers((res.users || []).filter(u => u.role !== 'admin' && u.role !== 'driver')))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = users.filter(u =>
    !search || (u.name || '').toLowerCase().includes(search.toLowerCase()) || (u.phone || '').includes(search)
  );

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const validate = () => {
    const errors = {};
    if (!editForm.name.trim() || editForm.name.trim().length < 3) errors.name = 'Full name (min 3 chars) is required';
    if (!editForm.phone.trim() || editForm.phone.length !== 11) errors.phone = 'Phone number must be exactly 11 digits';
    if (!editForm.cnic.trim() || editForm.cnic.length !== 13) errors.cnic = 'CNIC must be exactly 13 digits';
    if (!editForm.email.trim() || !/^\S+@\S+\.\S+$/.test(editForm.email)) errors.email = 'A valid email address is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete this user record? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
      showToast('User deleted permanently');
    } catch (e) {
      showToast('❌ Failed to delete: ' + e.message);
    }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setFormErrors({});
    setEditForm({
      name: u.name || '',
      phone: u.phone || '',
      email: u.email || '',
      cnic: u.cnic || '',
      gender: u.gender || 'other'
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setAction('updating');
    try {
      const res = await api.patch(`/admin/users/${editUser._id}`, editForm);
      if (res.success) {
        showToast('✅ Passenger updated successfully');
        setEditUser(null);
        load();
      }
    } catch (err) {
      showToast('❌ ' + (err.message || 'Update failed'));
    } finally {
      setAction(null);
    }
  };

  return (
    <div className="page">
      {toast && <div className="toast">{toast}</div>}
      
      <div className="page-head">
        <div>
          <h2 className="page-title">Passengers Management</h2>
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
                <tr><th>Name</th><th>Phone</th><th>Email</th><th>CNIC</th><th>Gender</th><th>Actions</th></tr>
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
                    <td>{u.cnic || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{u.gender || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => openEdit(u)}
                          style={{ 
                            background: '#f0f4ff', color: '#4a90e2', border: '1px solid #d1e3ff',
                            padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => deleteUser(u._id)}
                          style={{ 
                            background: '#fff0f0', color: '#e74c3c', border: '1px solid #ffcccc',
                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%', padding: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>Edit Passenger Profile</h3>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group" style={{ background: '#f9f9f9', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px', fontWeight: 'bold' }}>Email Address</label>
                <input style={{ width: '100%', padding: '10px', borderRadius: '6px', border: formErrors.email ? '1px solid red' : '1px solid #ddd' }} value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="example@safora.me" />
                {formErrors.email && <span style={{ color: 'red', fontSize: '10px' }}>{formErrors.email}</span>}
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>Full Name</label>
                <input style={{ width: '100%', padding: '10px', borderRadius: '6px', border: formErrors.name ? '1px solid red' : '1px solid #ddd' }} value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                {formErrors.name && <span style={{ color: 'red', fontSize: '10px' }}>{formErrors.name}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>Phone Number</label>
                  <input style={{ width: '100%', padding: '10px', borderRadius: '6px', border: formErrors.phone ? '1px solid red' : '1px solid #ddd' }} value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} maxLength={11} />
                  {formErrors.phone && <span style={{ color: 'red', fontSize: '10px' }}>{formErrors.phone}</span>}
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>CNIC</label>
                  <input style={{ width: '100%', padding: '10px', borderRadius: '6px', border: formErrors.cnic ? '1px solid red' : '1px solid #ddd' }} value={editForm.cnic} onChange={e => setEditForm({...editForm, cnic: e.target.value})} maxLength={13} />
                  {formErrors.cnic && <span style={{ color: 'red', fontSize: '10px' }}>{formErrors.cnic}</span>}
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>Gender</label>
                <select 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} 
                  value={editForm.gender} 
                  onChange={e => setEditForm({...editForm, gender: e.target.value})}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditUser(null)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={action === 'updating'} style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#F5C518', color: '#000', fontWeight: 700, cursor: 'pointer' }}>
                  {action === 'updating' ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .badge-yes { background: #d4edda; color: #155724; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .badge-no { background: #f8d7da; color: #721c24; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; }
        .modal-content { background:#fff; border-radius:12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .toast { position: fixed; bottom: 20px; right: 20px; background: #333; color: #fff; padding: 12px 24px; border-radius: 8px; z-index: 1100; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
