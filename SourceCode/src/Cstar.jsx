// src/Cstar.jsx - FIXED VERSION WITH PROPER TEMPLATE LITERALS
import React, { useState, useEffect } from 'react';
import api from './services/api';
import './Cstar.css';

function Cstar() {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVessels();
    // Refresh every 30 seconds
    const interval = setInterval(loadVessels, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadVessels = async () => {
    try {
      setError(null);
      const response = await api.getVessels();
      
      // Transform backend data to match card format
      const transformedVessels = response.data.map(vessel => ({
        id: vessel.id,
        name: vessel.name,
        imei: vessel.imei,
        status: getVesselStatus(vessel),
        latitude: vessel.latest_position?.latitude || 0,
        longitude: vessel.latest_position?.longitude || 0,
        lastUpdate: getLastUpdateText(vessel.last_check_in_at),
        emergency: vessel.emergency_alert_active
      }));
      
      setVessels(transformedVessels);
    } catch (err) {
      console.error('Error loading vessels:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getVesselStatus = (vessel) => {
    if (vessel.emergency_alert_active) return 'alert';
    if (!vessel.at_sea_status) return 'offline';
    if (!vessel.last_check_in_at) return 'offline';
    
    // Check if last check-in was more than 1 hour ago
    const lastCheckIn = new Date(vessel.last_check_in_at);
    const now = new Date();
    const hoursSinceCheckIn = (now - lastCheckIn) / (1000 * 60 * 60);
    
    if (hoursSinceCheckIn > 1) return 'offline';
    return 'safe';
  };

  const getLastUpdateText = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const lastUpdate = new Date(timestamp);
    const now = new Date();
    const diffMs = now - lastUpdate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'safe': return 'status_safe';
      case 'alert': return 'status_alert';
      case 'offline': return 'status_offline';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className='content_container'>
        <div className="loading_message">🔄 Loading vessels from backend...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='content_container'>
        <div className="error_message">
          <h3>⚠️ Backend Connection Error</h3>
          <p>{error}</p>
          <p style={{ marginTop: '15px', fontSize: '0.9rem' }}>Make sure:</p>
          <ul style={{ textAlign: 'left', marginTop: '10px', display: 'inline-block' }}>
            <li>Backend server is running (check Alvin's machine)</li>
            <li>ngrok tunnel is active</li>
            <li>API URL is correct in api.js</li>
          </ul>
          <button onClick={loadVessels}>🔄 Retry Connection</button>
        </div>
      </div>
    );
  }

  return (
    <div className='content_container'>
      <div className="vessel_header" style={{ borderBottom: 'none' }}>
        <h1>Fleet Dashboard</h1>
        <div className="status_badge status_safe" style={{ fontSize: '1rem' }}>
          Active Vessels: {vessels.filter(v => v.status !== 'offline').length} / {vessels.length}
        </div>
      </div>

      <div className="dashboard_grid">
        {vessels.map(vessel => (
          <div key={vessel.id} className="vessel_card">
            <div className="vessel_header">
              <h3 className="vessel_name">{vessel.name}</h3>
              <span className={`status_badge ${getStatusClass(vessel.status)}`}>
                {vessel.status}
                {vessel.emergency && ' 🚨'}
              </span>
            </div>
            <div className="vessel_details">
              <div className="detail_row">
                <span className="detail_label">IMEI:</span>
                <span className="detail_value">{vessel.imei}</span>
              </div>
              <div className="detail_row">
                <span className="detail_label">Location:</span>
                <span className="detail_value">
                  {vessel.latitude && vessel.longitude
                    ? `${vessel.latitude.toFixed(4)}, ${vessel.longitude.toFixed(4)}`
                    : 'No position data'}
                </span>
              </div>
              <div className="detail_row">
                <span className="detail_label">Last Update:</span>
                <span className="detail_value">{vessel.lastUpdate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {vessels.length === 0 && (
        <div className="no_vessels_message">
          <p>No vessels found in the system.</p>
        </div>
      )}
    </div>
  );
}

export default Cstar;
