// src/Cstar.jsx - FIXED VERSION WITH PROPER TEMPLATE LITERALS
import React, { useState, useEffect } from 'react';
import api from './services/api';
import './Cstar.css';

function Cstar() {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [vesselAlertRules, setVesselAlertRules] = useState([]);
  const [copiedRules, setCopiedRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);

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

  const handleVesselClick = async (vessel) => {
    setSelectedVessel(vessel);
    setLoadingRules(true);
    try {
      const response = await api.getAlertRules({ vessel_id: vessel.id });
      setVesselAlertRules(response.data || []);
    } catch (err) {
      console.error('Error loading alert rules:', err);
      setVesselAlertRules([]);
    } finally {
      setLoadingRules(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedVessel(null);
    setVesselAlertRules([]);
  };

  const handleCopyRules = () => {
    setCopiedRules([...vesselAlertRules]);
    alert(`Copied ${vesselAlertRules.length} alert rule(s) to clipboard`);
  };

  const handlePasteRules = async () => {
    if (copiedRules.length === 0) {
      alert('No rules copied. Copy rules from another vessel first.');
      return;
    }

    if (!window.confirm(`Paste ${copiedRules.length} alert rule(s) to ${selectedVessel.name}?`)) {
      return;
    }

    try {
      let successCount = 0;
      for (const rule of copiedRules) {
        const newRule = {
          name: rule.name,
          vessel_id: selectedVessel.id,
          field_name: rule.field_name,
          operator: rule.operator,
          threshold: rule.threshold,
          enabled: rule.enabled
        };
        await api.createAlertRule(newRule);
        successCount++;
      }
      alert(`Successfully pasted ${successCount} alert rule(s)`);
      // Reload alert rules for current vessel
      handleVesselClick(selectedVessel);
    } catch (err) {
      console.error('Error pasting rules:', err);
      alert('Error pasting rules: ' + err.message);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Delete this alert rule?')) return;

    try {
      await api.deleteAlertRule(ruleId);
      setVesselAlertRules(vesselAlertRules.filter(r => r.id !== ruleId));
      alert('Alert rule deleted successfully');
    } catch (err) {
      console.error('Error deleting rule:', err);
      alert('Error deleting rule: ' + err.message);
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
          <div
            key={vessel.id}
            className="vessel_card"
            onClick={() => handleVesselClick(vessel)}
            style={{ cursor: 'pointer' }}
          >
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

      {/* Vessel Details Modal */}
      {selectedVessel && (
        <div className="modal_overlay" onClick={handleCloseModal}>
          <div className="modal_content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal_header">
              <div>
                <h2>{selectedVessel.name}</h2>
                <p style={{ color: '#a0a0a0', margin: '5px 0 0 0' }}>
                  IMEI: {selectedVessel.imei}
                </p>
              </div>
              <button onClick={handleCloseModal} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Alert Rules ({vesselAlertRules.length})</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn_secondary"
                    onClick={handleCopyRules}
                    disabled={vesselAlertRules.length === 0}
                  >
                    📋 Copy Rules
                  </button>
                  <button
                    className="btn_primary"
                    onClick={handlePasteRules}
                    disabled={copiedRules.length === 0}
                  >
                    📥 Paste Rules ({copiedRules.length})
                  </button>
                </div>
              </div>

              {loadingRules ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#757575' }}>
                  Loading alert rules...
                </div>
              ) : vesselAlertRules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#757575' }}>
                  No alert rules configured for this vessel
                </div>
              ) : (
                <table className="user_table">
                  <thead>
                    <tr>
                      <th>Rule Name</th>
                      <th>Field</th>
                      <th>Condition</th>
                      <th>Threshold</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vesselAlertRules.map(rule => (
                      <tr key={rule.id}>
                        <td>{rule.name}</td>
                        <td style={{ fontFamily: 'monospace' }}>{rule.field_name}</td>
                        <td>{rule.operator}</td>
                        <td>{rule.threshold}</td>
                        <td>
                          <span className={`status_badge ${rule.enabled ? 'status_safe' : 'status_offline'}`}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action_btn delete"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cstar;
