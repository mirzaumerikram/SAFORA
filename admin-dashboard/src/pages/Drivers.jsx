import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import './TablePage.css';

export default function Drivers() {
  const { search }              = useOutletContext();
  const [drivers, setDrivers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [action, setAction]     = useState(null); // driverId_approve | driverId_reject
  const [toast, setToast]       = useState('');

  const load = () => {
    setLoading(true);
    api.get('/admin/drivers/pending').then(res => setDrivers(res.drivers || [])).catch(() => setDrivers([])).finally(() => setLoading(false));
  };
  useEffect(load, []);

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
      setDrivers(prev => prev.filter(d => d._id !== id));
      showToast('✅ Driver approved successfully');
    } catch (e) { showToast('❌ ' + e.message); }
    finally { setAction(null); }
  };

  const reject = async (id) => {
    if (!window.confirm('Reject this driver application?')) return;
    setAction(id + '_reject');
    try {
      await api.patch(`/admin/drivers/${id}/reject`, { reason: 'Rejected by admin' });
      setDrivers(prev => prev.filter(d => d._id !== id));
      showToast('Driver rejected');
    } catch (e) { showToast('❌ ' + e.message); }
    finally { setAction(null); }
  };

  return (
    <div className="page">
      {toast && <div className="toast">{toast}</div>}

      <div className="page-head">
        <div>
          <h2 className="page-title">Driver Approvals</h2>
          <p className="page-sub">Review and approve pending driver applications</p>
        </div>
        <div className="badge-count">{filtered.length} Results</div>
      </div>

      {loading ? <div className="loading-box">Loading drivers...</div> : (
        <>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="es-icon">{search ? '🔍' : '✅'}</div>
              <div className="es-title">{search ? 'No results found' : 'All caught up!'}</div>
              <div className="es-sub">{search ? `No driver matches "${search}"` : 'No pending driver approvals'}</div>
            </div>
          ) : (
            <div className="card-grid">
              {filtered.map(d => (
                <div className="driver-card" key={d._id}>
                  <div className="dc-top">
                    <div className="dc-avatar">{(d.user?.name || 'D').charAt(0).toUpperCase()}</div>
                    <div className="dc-info">
                      <div className="dc-name">{d.user?.name || 'Unknown'}</div>
                      <div className="dc-phone">{d.user?.phone || '—'}</div>
                    </div>
                    <div className="dc-badge">PENDING</div>
                  </div>
                  <div className="dc-details">
                    <div className="dc-row"><span>CNIC</span><span>{d.user?.cnic || '—'}</span></div>
                    <div className="dc-row"><span>Email</span><span>{d.user?.email || '—'}</span></div>
                    <div className="dc-row"><span>Applied</span><span>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</span></div>
                    <div className="dc-row"><span>Background</span><span className="text-orange">{d.backgroundCheck?.status || 'pending'}</span></div>
                  </div>
                  <div className="dc-actions">
                    <button
                      className="btn-approve"
                      onClick={() => approve(d._id)}
                      disabled={!!action}
                    >
                      {action === d._id + '_approve' ? '...' : '✓ Approve'}
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => reject(d._id)}
                      disabled={!!action}
                    >
                      {action === d._id + '_reject' ? '...' : '✗ Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
