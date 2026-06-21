import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './TablePage.css';

const getSentimentBadge = (tag) => {
  switch (tag) {
    case 'Positive':
      return <span className="status-badge" style={{ background: '#e8f8f5', color: '#27ae60' }}>{tag}</span>;
    case 'Negative':
      return <span className="status-badge" style={{ background: '#fdedec', color: '#e74c3c' }}>{tag}</span>;
    case 'Neutral':
    default:
      return <span className="status-badge" style={{ background: '#fef9e7', color: '#f39c12' }}>{tag}</span>;
  }
};

export default function SentimentReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await api.get('/admin/sentiment-reviews');
      if (res.success) {
        setReviews(res.reviews);
      }
    } catch (error) {
      console.error("Failed to load sentiment reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">AI Sentiment Reviews</h2>
          <p className="page-sub">NLP-powered passenger feedback categorization</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="badge-count" style={{ background: '#e8f8f5', color: '#27ae60' }}>
            {reviews.filter(r => r.sentimentTag === 'Positive').length} Positive
          </div>
          <div className="badge-count" style={{ background: '#fdedec', color: '#e74c3c' }}>
            {reviews.filter(r => r.sentimentTag === 'Negative').length} Negative
          </div>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Passenger</th>
              <th>Driver</th>
              <th>Rating</th>
              <th style={{ width: '40%' }}>Feedback Comment</th>
              <th>AI Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Loading NLP data...</td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No textual feedback received yet.</td></tr>
            ) : (
              reviews.map((r, i) => (
                <tr key={r._id || i}>
                  <td>{new Date(r.rideDate).toLocaleDateString()}</td>
                  <td>{r.passengerName}</td>
                  <td>{r.driverName}</td>
                  <td>
                    <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>★ {r.score}</span>/5
                  </td>
                  <td style={{ fontStyle: 'italic', color: '#555' }}>"{r.comment}"</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {getSentimentBadge(r.sentimentTag)}
                      <span style={{ fontSize: '12px', color: '#888' }}>
                        Pol: {r.polarityScore.toFixed(2)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
