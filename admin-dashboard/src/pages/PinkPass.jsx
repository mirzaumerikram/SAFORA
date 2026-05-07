import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './TablePage.css';

export default function PinkPass() {
  const [passengers, setPassengers] = useState([]);
  const [drivers, setDrivers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab]   = useState('passengers');

  useEffect(() => {
    loadPending();
  }, [activeTab]);

  const loadPending = async () => {
    setLoading(true);
    try {
      if (activeTab === 'passengers') {
        const res = await api.get('/admin/pinkpass/passengers/pending');
        setPassengers(res.users || []);
      } else {
        const res = await api.get('/admin/pinkpass/pending');
        setDrivers(res.drivers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this application?`)) return;
    try {
      if (activeTab === 'passengers') {
        await api.patch(`/admin/pinkpass/passengers/${userId}/verify`, { action });
        setPassengers(prev => prev.filter(u => u._id !== userId));
      } else {
        await api.patch(`/pink-pass/admin-approve/${userId}`, { action });
        setDrivers(prev => prev.filter(d => d._id !== userId));
      }
      setSelectedUser(null);
      window.dispatchEvent(new Event('safora:refresh-badges'));
    } catch (e) {
      alert('Action failed: ' + e.message);
    }
  };

  const currentList = activeTab === 'passengers' ? passengers : drivers;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Pink Pass Verifications</h2>
          <p className="page-sub">Review female identity documents</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <button 
          className={activeTab === 'passengers' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('passengers')}
        >
          Passengers
        </button>
        <button 
          className={activeTab === 'drivers' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('drivers')}
        >
          Drivers
        </button>
      </div>

      {loading ? (
        <div className="loading-box">Loading applications...</div>
      ) : currentList.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">🌸</div>
          <div className="es-title">No pending reviews</div>
          <div className="es-sub">All {activeTab} Pink Pass applications have been processed</div>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>{activeTab === 'passengers' ? 'Passenger' : 'Driver'}</th>
                <th>Phone</th>
                <th>Applied At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentList.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="cell-user">
                      <div className="cu-avatar" style={{ background: '#fce4ec', color: '#e91e63' }}>
                        {(u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.name || '—'}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>{u.email || u.licenseNumber || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.phone || '—'}</td>
                  <td>{u.pinkPassAppliedAt ? new Date(u.pinkPassAppliedAt).toLocaleString() : '—'}</td>
                  <td>
                    <button 
                      className="btn-view"
                      onClick={() => setSelectedUser(u)}
                      style={{ 
                        background: '#e91e63', 
                        color: '#fff', 
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      View Documents
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Verification Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Review Pink Pass: {selectedUser.name}</h3>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px' }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 10 }}>Captured CNIC</p>
                {selectedUser.pinkPassCnicPhoto ? (
                  <img 
                    src={selectedUser.pinkPassCnicPhoto} 
                    alt="CNIC" 
                    style={{ width: '100%', borderRadius: 8, border: '1px solid #ddd', minHeight: 150, background: '#f5f5f5' }} 
                  />
                ) : <div style={{ padding: 20, background: '#eee', borderRadius: 8 }}>No CNIC image captured</div>}
              </div>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 10 }}>Reference Selfie</p>
                {selectedUser.pinkPassSelfiePhoto ? (
                  <img 
                    src={selectedUser.pinkPassSelfiePhoto} 
                    alt="Selfie" 
                    style={{ width: '100%', borderRadius: 8, border: '1px solid #ddd', minHeight: 150, background: '#f5f5f5' }} 
                  />
                ) : <div style={{ padding: 20, background: '#eee', borderRadius: 8 }}>No selfie image captured</div>}
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #eee' }}>
              <button 
                onClick={() => handleVerify(selectedUser._id, 'reject')}
                style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid #e74c3c', color: '#e74c3c', background: '#fff', cursor: 'pointer' }}
              >
                Reject Application
              </button>
              <button 
                onClick={() => handleVerify(selectedUser._id, 'approve')}
                style={{ padding: '10px 20px', borderRadius: 6, border: 'none', color: '#fff', background: '#2ecc71', cursor: 'pointer', fontWeight: 600 }}
              >
                Approve & Activate
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .modal-header {
          padding: 15px 20px;
          background: #f8f9fa;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eee;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #888;
        }
        .tab-btn {
          padding: 8px 16px;
          border: none;
          background: #eee;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          color: #666;
        }
        .tab-btn.active {
          background: #e91e63;
          color: white;
        }
      `}</style>
    </div>
  );
}
