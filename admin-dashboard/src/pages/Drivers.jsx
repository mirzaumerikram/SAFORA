import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import './TablePage.css';

export default function Drivers() {
  const { search }              = useOutletContext();
  const [drivers, setDrivers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'
  const [action, setAction]     = useState(null); // driverId_approve | driverId_reject
  const [toast, setToast]       = useState('');
  
  // Edit Modal State
  const [editDriver, setEditDriver] = useState(null);
  const [editForm, setEditForm]     = useState({ name: '', phone: '', email: '', cnic: '', make: '', model: '', plateNumber: '' });

  const load = () => {
    setLoading(true);
    const endpoint = activeTab === 'pending' ? '/admin/drivers/pending' : '/admin/drivers/all';
    api.get(endpoint)
      .then(res => setDrivers(res.drivers || []))
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeTab]);

  const filtered = drivers.filter(d => 
    !search || 
    (d.user?.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (d.user?.phone || '').includes(search) ||
    (d.user?.cnic || '').includes(search)
  );

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const approve = async (id) => {
    setAction(id + '_approve');
    try {
      await api.patch(`/admin/drivers/${id}/approve`);
      if (activeTab === 'pending') {
        setDrivers(prev => prev.filter(d => d._id !== id));
      } else {
        setDrivers(prev => prev.map(d => d._id === id ? { ...d, backgroundCheck: { ...d.backgroundCheck, status: 'approved' } } : d));
      }
      showToast('✅ Driver approved successfully');
      window.dispatchEvent(new Event('safora:refresh-badges'));
    } catch (e) { showToast('❌ ' + e.message); }
    finally { setAction(null); }
  };

  const reject = async (id) => {
    if (!window.confirm('Reject this driver application?')) return;
    setAction(id + '_reject');
    try {
      await api.patch(`/admin/drivers/${id}/reject`, { reason: 'Rejected by admin' });
      if (activeTab === 'pending') {
        setDrivers(prev => prev.filter(d => d._id !== id));
      } else {
        setDrivers(prev => prev.map(d => d._id === id ? { ...d, backgroundCheck: { ...d.backgroundCheck, status: 'rejected' } } : d));
      }
      showToast('Driver rejected');
      window.dispatchEvent(new Event('safora:refresh-badges'));
    } catch (e) { showToast('❌ ' + e.message); }
    finally { setAction(null); }
  };

  const openEdit = (d) => {
    setEditDriver(d);
    setEditForm({
      name: d.user?.name || '',
      phone: d.user?.phone || '',
      email: d.user?.email || '',
      cnic: d.user?.cnic || d.cnic || '',
      make: d.vehicleInfo?.make || '',
      model: d.vehicleInfo?.model || '',
      plateNumber: d.vehicleInfo?.plateNumber || ''
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setAction('updating');
    try {
      const payload = {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        cnic: editForm.cnic,
        vehicleInfo: {
          make: editForm.make,
          model: editForm.model,
          plateNumber: editForm.plateNumber
        }
      };
      await api.patch(`/admin/drivers/${editDriver._id}`, payload);
      showToast('✅ Driver updated successfully');
      setEditDriver(null);
      load(); // Reload data
    } catch (err) {
      showToast('❌ Update failed: ' + err.message);
    } finally {
      setAction(null);
    }
  };

  return (
    <div className="page">
      {toast && <div className="toast">{toast}</div>}

      <div className="page-head">
        <div>
          <h2 className="page-title">Drivers Management</h2>
          <p className="page-sub">View and manage your driver fleet</p>
        </div>
        <div className="badge-count">{filtered.length} Results</div>
      </div>

      <div className="tab-container" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('pending')}
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            background: activeTab === 'pending' ? '#F5C518' : '#eee',
            color: activeTab === 'pending' ? '#000' : '#666',
            fontWeight: 700, cursor: 'pointer'
          }}
        >
          Pending Approvals
        </button>
        <button 
          onClick={() => setActiveTab('all')}
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            background: activeTab === 'all' ? '#F5C518' : '#eee',
            color: activeTab === 'all' ? '#000' : '#666',
            fontWeight: 700, cursor: 'pointer'
          }}
        >
          All Drivers
        </button>
      </div>

      {loading ? <div className="loading-box">Loading drivers...</div> : (
        <>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="es-icon">{search ? '🔍' : '✅'}</div>
              <div className="es-title">{search ? 'No results found' : 'No drivers here'}</div>
              <div className="es-sub">{search ? `No driver matches "${search}"` : `No drivers in "${activeTab}" list`}</div>
            </div>
          ) : (
            <div className="card-grid">
              {filtered.map(d => (
                <div className="driver-card" key={d._id} style={{ opacity: d.backgroundCheck?.status === 'rejected' ? 0.7 : 1 }}>
                  <div className="dc-top">
                    <div className="dc-avatar">{(d.user?.name || 'D').charAt(0).toUpperCase()}</div>
                    <div className="dc-info">
                      <div className="dc-name">{d.user?.name || 'Unknown'}</div>
                      <div className="dc-phone">{d.user?.phone || '—'}</div>
                    </div>
                    <div className={`dc-badge status-${d.backgroundCheck?.status || 'pending'}`}>
                      {(d.backgroundCheck?.status || 'pending').toUpperCase()}
                    </div>
                  </div>
                  <div className="dc-details">
                    <div className="dc-row"><span>CNIC</span><span>{d.user?.cnic || d.cnic || '—'}</span></div>
                    <div className="dc-row"><span>Email</span><span>{d.user?.email || '—'}</span></div>
                    <div className="dc-row"><span>Applied</span><span>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</span></div>
                    <div className="dc-row"><span>Vehicle</span><span>{d.vehicleInfo?.make} {d.vehicleInfo?.model} ({d.vehicleInfo?.plateNumber})</span></div>
                  </div>
                  <div className="dc-actions">
                    <button className="btn-edit" onClick={() => openEdit(d)} style={{ background: '#eee', color: '#333', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                      ✎ Edit
                    </button>
                    {d.backgroundCheck?.status === 'pending' && (
                      <button
                        className="btn-approve"
                        onClick={() => approve(d._id)}
                        disabled={!!action}
                      >
                        {action === d._id + '_approve' ? '...' : '✓ Approve'}
                      </button>
                    )}
                    {d.backgroundCheck?.status !== 'rejected' && (
                      <button
                        className="btn-reject"
                        onClick={() => reject(d._id)}
                        disabled={!!action}
                      >
                        {action === d._id + '_reject' ? '...' : '✗ Reject'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editDriver && (
        <div className="modal-overlay" onClick={() => setEditDriver(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%', padding: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>Edit Driver Details</h3>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>Full Name</label>
                <input style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>Phone</label>
                <input style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>CNIC</label>
                <input style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} value={editForm.cnic} onChange={e => setEditForm({...editForm, cnic: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>Vehicle Make</label>
                  <input style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} value={editForm.make} onChange={e => setEditForm({...editForm, make: e.target.value})} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>Model</label>
                  <input style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} value={editForm.model} onChange={e => setEditForm({...editForm, model: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>Plate Number</label>
                <input style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} value={editForm.plateNumber} onChange={e => setEditForm({...editForm, plateNumber: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditDriver(null)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={action === 'updating'} style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#F5C518', color: '#000', fontWeight: 700, cursor: 'pointer' }}>
                  {action === 'updating' ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .status-approved { background: #d4edda; color: #155724; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-rejected { background: #f8d7da; color: #721c24; }
        .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; }
        .modal-content { background:#fff; border-radius:12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
}
