// src/Cstar.jsx - FIXED VERSION WITH PROPER TEMPLATE LITERALS
import { useState, useEffect } from 'react';
import api from './services/api';
import './Cstar.css';
import AlertBuilder from './AlertBuilder';
import VesselSettingsModal from './VesselSettingsModal';

function Cstar({ currentUser }) {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [vesselAlertRules, setVesselAlertRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [showAlertBuilder, setShowAlertBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [showCopyToVessel, setShowCopyToVessel] = useState(false);
  const [copyingRules, setCopyingRules] = useState(false);

  // Compound alert state
  const [compoundRules, setCompoundRules] = useState([]);
  const [loadingCompoundRules, setLoadingCompoundRules] = useState(false);
  const [showCompoundBuilder, setShowCompoundBuilder] = useState(false);
  const [editingCompoundRule, setEditingCompoundRule] = useState(null);
  const [activeCompoundAlerts, setActiveCompoundAlerts] = useState([]);
  const [vesselCompoundBadges, setVesselCompoundBadges] = useState({});
  const [compoundFormData, setCompoundFormData] = useState({ name: '', description: '', threshold_count: 2, time_window_mins: 60, enabled: true });
  const [savingCompound, setSavingCompound] = useState(false);
  const [editingVessel, setEditingVessel] = useState(null);

  const isAdmin = currentUser && currentUser.role === 'admin';
  const isSupervisor = currentUser && (currentUser.role === 'supervisor' || currentUser.role === 'admin');

  useEffect(() => {
    loadVessels();
    // Refresh every 30 seconds
    const interval = setInterval(loadVessels, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadCompoundBadges();
    const interval = setInterval(loadCompoundBadges, 30000);
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

  const loadCompoundBadges = async () => {
    try {
      const response = await api.getActiveCompoundAlerts(null);
      const alerts = response.data || [];
      const badges = {};
      alerts.forEach(alert => {
        badges[alert.vessel_id] = (badges[alert.vessel_id] || 0) + 1;
      });
      setVesselCompoundBadges(badges);
    } catch (err) {
      // Silently fail — badges are non-critical
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
    setLoadingCompoundRules(true);

    // Fetch individual alert rules independently so a compound API failure can't affect them
    try {
      const rulesResponse = await api.getAlertRules({ vessel_id: vessel.id });
      setVesselAlertRules(rulesResponse.data || []);
    } catch (err) {
      console.error('Error loading alert rules:', err);
      setVesselAlertRules([]);
    } finally {
      setLoadingRules(false);
    }

    // Fetch compound data separately — gracefully degrades if endpoints not yet live
    try {
      const [compoundRulesResponse, activeCompoundResponse] = await Promise.all([
        api.getCompoundRules(vessel.id),
        api.getActiveCompoundAlerts(vessel.id)
      ]);
      setCompoundRules(compoundRulesResponse.data || []);
      setActiveCompoundAlerts(activeCompoundResponse.data || []);
    } catch (err) {
      console.error('Error loading compound data:', err);
      setCompoundRules([]);
      setActiveCompoundAlerts([]);
    } finally {
      setLoadingCompoundRules(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedVessel(null);
    setVesselAlertRules([]);
    setCompoundRules([]);
    setActiveCompoundAlerts([]);
    setShowCompoundBuilder(false);
    setEditingCompoundRule(null);
  };

  const handleCopyToVessel = () => {
    if (vesselAlertRules.length === 0) {
      alert('No alert rules to copy from this vessel');
      return;
    }
    setShowCopyToVessel(true);
  };

  const handleCopyRulesToSelectedVessel = async (targetVesselId) => {
    if (!targetVesselId) {
      alert('Please select a target vessel');
      return;
    }

    const targetVessel = vessels.find(v => v.id === parseInt(targetVesselId));
    if (!targetVessel) {
      alert('Invalid vessel selection');
      return;
    }

    if (!window.confirm(`Copy ${vesselAlertRules.length} alert rule(s) from ${selectedVessel.name} to ${targetVessel.name}?`)) {
      // Reset dropdown selection
      document.getElementById('targetVessel').value = '';
      return;
    }

    setCopyingRules(true);
    try {
      let successCount = 0;
      for (const rule of vesselAlertRules) {
        const newRule = {
          name: rule.name,
          vessel_id: parseInt(targetVesselId),
          field_name: rule.field_name,
          operator: rule.operator,
          threshold: rule.threshold,
          enabled: rule.enabled
        };
        await api.createAlertRule(newRule);
        successCount++;
      }
      alert(`Successfully copied ${successCount} alert rule(s) to ${targetVessel.name}`);
      setShowCopyToVessel(false);
      // Reset dropdown
      document.getElementById('targetVessel').value = '';
    } catch (err) {
      console.error('Error copying rules:', err);
      alert('Error copying rules: ' + err.message);
      // Reset dropdown on error
      document.getElementById('targetVessel').value = '';
    } finally {
      setCopyingRules(false);
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

  const handleCreateAlert = () => {
    setEditingRule(null);
    setShowAlertBuilder(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setShowAlertBuilder(true);
  };

  const handleAlertBuilderSave = () => {
    setShowAlertBuilder(false);
    setEditingRule(null);
    // Reload alert rules for current vessel
    if (selectedVessel) {
      handleVesselClick(selectedVessel);
    }
  };

  const handleAlertBuilderCancel = () => {
    setShowAlertBuilder(false);
    setEditingRule(null);
  };

  const handleDeleteVessel = async (vesselId, vesselName) => {
    if (!window.confirm(`Are you sure you want to delete vessel "${vesselName}"? This action cannot be undone and will also delete all associated alert rules and data.`)) {
      return;
    }

    try {
      await api.deleteVessel(vesselId);
      alert(`Vessel "${vesselName}" deleted successfully`);

      // Close modal and refresh vessel list
      setSelectedVessel(null);
      setVesselAlertRules([]);
      loadVessels();
    } catch (err) {
      console.error('Error deleting vessel:', err);
      alert('Error deleting vessel: ' + err.message);
    }
  };

  const handleVesselSave = async (vesselData) => {
    try {
      await api.updateVessel(vesselData.id, vesselData);
      setEditingVessel(null);
      loadVessels();
    } catch (err) {
      console.error('Error updating vessel:', err);
      alert('Error saving vessel: ' + err.message);
    }
  };

  // Compound rule handlers
  const handleCreateCompoundRule = () => {
    setEditingCompoundRule(null);
    setCompoundFormData({ name: '', description: '', threshold_count: 2, time_window_mins: 60, enabled: true });
    setShowCompoundBuilder(true);
  };

  const handleEditCompoundRule = (rule) => {
    setEditingCompoundRule(rule);
    setCompoundFormData({
      name: rule.name,
      description: rule.description || '',
      threshold_count: rule.threshold_count,
      time_window_mins: rule.time_window_mins,
      enabled: rule.enabled
    });
    setShowCompoundBuilder(true);
  };

  const handleDeleteCompoundRule = async (id) => {
    if (!window.confirm('Delete this compound alert rule?')) return;
    try {
      await api.deleteCompoundRule(id);
      setCompoundRules(compoundRules.filter(r => r.id !== id));
    } catch (err) {
      alert('Error deleting compound rule: ' + err.message);
    }
  };

  const handleSaveCompoundRule = async () => {
    if (!compoundFormData.name.trim()) {
      alert('Rule name is required');
      return;
    }
    setSavingCompound(true);
    try {
      if (editingCompoundRule) {
        const response = await api.updateCompoundRule(editingCompoundRule.id, compoundFormData);
        setCompoundRules(compoundRules.map(r => r.id === editingCompoundRule.id ? response.data : r));
      } else {
        const response = await api.createCompoundRule({ ...compoundFormData, vessel_id: selectedVessel.id });
        setCompoundRules([...compoundRules, response.data]);
      }
      setShowCompoundBuilder(false);
      setEditingCompoundRule(null);
    } catch (err) {
      alert('Error saving compound rule: ' + err.message);
    } finally {
      setSavingCompound(false);
    }
  };

  const handleCancelCompoundRule = () => {
    setShowCompoundBuilder(false);
    setEditingCompoundRule(null);
  };

  const handleAcknowledgeCompoundAlert = async (id) => {
    try {
      await api.acknowledgeCompoundAlert(id);
      setActiveCompoundAlerts(activeCompoundAlerts.map(a =>
        a.id === id ? { ...a, status: 'acknowledged' } : a
      ));
    } catch (err) {
      alert('Error acknowledging alert: ' + err.message);
    }
  };

  const handleResolveCompoundAlert = async (id) => {
    try {
      await api.resolveCompoundAlert(id);
      setActiveCompoundAlerts(activeCompoundAlerts.filter(a => a.id !== id));
      // Decrement badge for this vessel
      const updatedBadges = { ...vesselCompoundBadges };
      if (updatedBadges[selectedVessel.id]) {
        updatedBadges[selectedVessel.id] = Math.max(0, updatedBadges[selectedVessel.id] - 1);
        if (updatedBadges[selectedVessel.id] === 0) delete updatedBadges[selectedVessel.id];
      }
      setVesselCompoundBadges(updatedBadges);
    } catch (err) {
      alert('Error resolving alert: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className='content_container'>
        <div className="loading_container">
          <div className="loading_spinner"></div>
          <p className="loading_text">Loading vessels from backend...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='content_container'>
        <div className="error_message">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Backend Connection Error
          </h3>
          <p>{error}</p>
          <p style={{ marginTop: '15px', fontSize: '0.9rem' }}>Make sure:</p>
          <ul style={{ textAlign: 'left', marginTop: '10px', display: 'inline-block' }}>
            <li>Backend server is running (check Alvin's machine)</li>
            <li>ngrok tunnel is active</li>
            <li>API URL is correct in api.js</li>
          </ul>
          <button onClick={loadVessels} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}><span className="inline_spinner"></span>Retry Connection</button>
        </div>
      </div>
    );
  }

  return (
    <div className='content_container'>
      <div className="vessel_header" style={{ borderBottom: 'none' }}>
        <h1>Fleet Dashboard</h1>
        <div className="fleet_count_badge">
          <span className="fcb_dot"></span>
          {vessels.filter(v => v.status !== 'offline').length} / {vessels.length} Active
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="vessel_card_icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={vessel.status === 'safe' ? '#4CAF50' : vessel.status === 'alert' ? '#f44336' : '#6c757d'}>
                    <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.25 0 2.45-.2 3.6-.54a9.43 9.43 0 0 0 8.8 0C17.55 22.8 18.75 23 20 23h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.47.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/>
                  </svg>
                </div>
                <h3 className="vessel_name">{vessel.name}</h3>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span className={`status_badge ${getStatusClass(vessel.status)}`}>
                  {vessel.status}
                  {vessel.emergency && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#f44336" style={{ marginLeft: '4px', verticalAlign: 'middle' }}>
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                  )}
                </span>
                {vesselCompoundBadges[vessel.id] > 0 && (
                  <span className="compound_badge" title="Active compound alerts">
                    {vesselCompoundBadges[vessel.id]}
                  </span>
                )}
              </div>
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
        <div className="empty_state">
          <div className="empty_state_icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="#a0a0a0"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.25 0 2.45-.2 3.6-.54a9.43 9.43 0 0 0 8.8 0C17.55 22.8 18.75 23 20 23h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.47.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/></svg>
          </div>
          <h4>No vessels registered</h4>
          <p>Add vessels via Settings to start tracking your fleet.</p>
        </div>
      )}

      {/* Vessel Details Modal */}
      {selectedVessel && (
        <div className="modal_overlay" onClick={handleCloseModal} onWheel={(e) => e.stopPropagation()}>
          <div className="modal_content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal_header">
              <div>
                <h2>{selectedVessel.name}</h2>
                <p style={{ color: '#a0a0a0', margin: '5px 0 0 0' }}>
                  IMEI: {selectedVessel.imei}
                </p>
              </div>
              <button onClick={handleCloseModal} className="modal_close_btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="modal_body">
              {isAdmin && (
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(211, 47, 47, 0.1)', border: '1px solid #d32f2f', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#d32f2f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Admin Actions
                      </strong>
                      <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#757575' }}>
                        Delete this vessel and all associated data
                      </p>
                    </div>
                    <button
                      className="action_btn delete"
                      onClick={() => handleDeleteVessel(selectedVessel.id, selectedVessel.name)}
                      style={{ padding: '10px 20px', fontSize: '16px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      Delete Vessel
                    </button>
                    <button
                      className="btn_secondary"
                      onClick={() => setEditingVessel(selectedVessel)}
                      style={{ padding: '10px 20px', fontSize: '16px' }}
                    >
                      Edit Settings
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Alert Rules ({vesselAlertRules.length})</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn_primary"
                    onClick={handleCreateAlert}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: '5px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Create Alert
                  </button>
                  <button
                    className="btn_secondary"
                    onClick={handleCopyToVessel}
                    disabled={vesselAlertRules.length === 0}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Rules to Another Vessel
                  </button>
                </div>
              </div>

              {loadingRules ? (
                <div className="loading_container">
                  <div className="loading_spinner"></div>
                  <p className="loading_text">Loading alert rules...</p>
                </div>
              ) : vesselAlertRules.length === 0 ? (
                <div className="empty_state">
                  <div className="empty_state_icon">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" strokeWidth="1.5" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </div>
                  <h4>No alert rules configured</h4>
                  <p>Use Create Alert to set up monitoring thresholds for this vessel.</p>
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
                            className="action_btn"
                            onClick={() => handleEditRule(rule)}
                            style={{ marginRight: '5px' }}
                          >
                            Edit
                          </button>
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

              {/* Compound Rules Section */}
              <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Compound Rules ({compoundRules.length})</h3>
                  {isAdmin && (
                    <button className="btn_primary" onClick={handleCreateCompoundRule}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: '5px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Create Compound Rule
                    </button>
                  )}
                </div>

                {/* Inline compound rule form */}
                {showCompoundBuilder && (
                  <div className="compound_form">
                    <h4>{editingCompoundRule ? 'Edit Compound Rule' : 'New Compound Rule'}</h4>
                    <div className="compound_form_group">
                      <label>Rule Name</label>
                      <input
                        type="text"
                        value={compoundFormData.name}
                        onChange={e => setCompoundFormData({ ...compoundFormData, name: e.target.value })}
                        placeholder="e.g. Multi-System Failure"
                      />
                    </div>
                    <div className="compound_form_group">
                      <label>Description (optional)</label>
                      <input
                        type="text"
                        value={compoundFormData.description}
                        onChange={e => setCompoundFormData({ ...compoundFormData, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <div className="compound_form_group">
                        <label>Trigger when</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            min="1"
                            value={compoundFormData.threshold_count}
                            onChange={e => setCompoundFormData({ ...compoundFormData, threshold_count: parseInt(e.target.value) || 1 })}
                            style={{ width: '70px' }}
                          />
                          <span style={{ color: '#a0a0a0', whiteSpace: 'nowrap' }}>or more distinct alerts are active</span>
                        </div>
                      </div>
                      <div className="compound_form_group">
                        <label>Within</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            min="1"
                            value={compoundFormData.time_window_mins}
                            onChange={e => setCompoundFormData({ ...compoundFormData, time_window_mins: parseInt(e.target.value) || 1 })}
                            style={{ width: '80px' }}
                          />
                          <span style={{ color: '#a0a0a0' }}>minutes</span>
                        </div>
                      </div>
                    </div>
                    <div className="compound_form_group">
                      <label className="checkbox_label">
                        <input
                          type="checkbox"
                          checked={compoundFormData.enabled}
                          onChange={e => setCompoundFormData({ ...compoundFormData, enabled: e.target.checked })}
                        />
                        Enabled
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <button className="btn_primary" onClick={handleSaveCompoundRule} disabled={savingCompound}>
                        {savingCompound ? 'Saving...' : (editingCompoundRule ? 'Update Rule' : 'Create Rule')}
                      </button>
                      <button className="btn_secondary" onClick={handleCancelCompoundRule} disabled={savingCompound}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {loadingCompoundRules ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#757575' }}>
                    Loading compound rules...
                  </div>
                ) : compoundRules.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#757575' }}>
                    No compound rules configured for this vessel
                  </div>
                ) : (
                  <table className="user_table">
                    <thead>
                      <tr>
                        <th>Rule Name</th>
                        <th>Threshold</th>
                        <th>Time Window</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compoundRules.map(rule => (
                        <tr key={rule.id}>
                          <td>{rule.name}</td>
                          <td>{rule.threshold_count} alerts</td>
                          <td>{rule.time_window_mins} mins</td>
                          <td>
                            <span className={`status_badge ${rule.enabled ? 'status_safe' : 'status_offline'}`}>
                              {rule.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>
                          <td>
                            {isAdmin && (
                              <>
                                <button
                                  className="action_btn"
                                  onClick={() => handleEditCompoundRule(rule)}
                                  style={{ marginRight: '5px' }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="action_btn delete"
                                  onClick={() => handleDeleteCompoundRule(rule.id)}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Active Compound Alerts */}
                {activeCompoundAlerts.length > 0 && (
                  <div style={{ marginTop: '25px' }}>
                    <h4 style={{ marginBottom: '15px', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      Active Compound Alerts ({activeCompoundAlerts.length})
                    </h4>
                    <table className="user_table">
                      <thead>
                        <tr>
                          <th>Alert</th>
                          <th>First Triggered</th>
                          <th>Alert Count</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCompoundAlerts.map(alert => (
                          <tr key={alert.id}>
                            <td>{alert.alert_text}</td>
                            <td style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>
                              {new Date(alert.first_triggered_at).toLocaleString()}
                            </td>
                            <td>{alert.triggered_alert_count}</td>
                            <td>
                              <span className={`status_badge ${alert.status === 'active' ? 'status_alert' : 'status_offline'}`}>
                                {alert.status}
                              </span>
                            </td>
                            <td>
                              {isSupervisor && alert.status === 'active' && (
                                <button
                                  className="action_btn"
                                  onClick={() => handleAcknowledgeCompoundAlert(alert.id)}
                                  style={{ marginRight: '5px' }}
                                >
                                  Acknowledge
                                </button>
                              )}
                              {isSupervisor && (
                                <button
                                  className="action_btn delete"
                                  onClick={() => handleResolveCompoundAlert(alert.id)}
                                >
                                  Resolve
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Rules Modal */}
      {showCopyToVessel && (
        <div className="modal_overlay" onClick={() => setShowCopyToVessel(false)} onWheel={(e) => e.stopPropagation()} style={{ zIndex: 1001 }}>
          <div className="modal_content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', padding: '40px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '15px', fontSize: '28px' }}>Copy Alert Rules</h2>
            <p style={{ color: '#a0a0a0', marginBottom: '30px', fontSize: '18px' }}>
              Copy {vesselAlertRules.length} alert rules from <strong>{selectedVessel.name}</strong> to another vessel
            </p>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '15px', fontSize: '20px', fontWeight: '600' }}>
                Select Target Vessel:
              </label>
              <select
                id="targetVessel"
                style={{
                  width: '100%',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #2196F3',
                  fontSize: '20px',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
                size="6"
                onChange={(e) => {
                  if (e.target.value) {
                    handleCopyRulesToSelectedVessel(e.target.value);
                  }
                }}
                disabled={copyingRules}
              >
                <option value="" style={{ fontSize: '20px', padding: '15px' }}>-- Select a vessel --</option>
                {vessels
                  .filter(v => v.id !== selectedVessel.id)
                  .map(vessel => (
                    <option key={vessel.id} value={vessel.id} style={{ fontSize: '20px', padding: '15px' }}>
                      {vessel.name} (IMEI: {vessel.imei})
                    </option>
                  ))}
              </select>
            </div>

            {copyingRules && (
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                border: '2px solid #2196F3',
                borderRadius: '8px',
                marginBottom: '25px',
                color: '#2196F3',
                textAlign: 'center',
                fontSize: '20px',
                fontWeight: '600'
              }}>
                <span className="inline_spinner"></span>Copying rules...
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button
                className="btn_secondary"
                onClick={() => setShowCopyToVessel(false)}
                disabled={copyingRules}
                style={{ padding: '15px 30px', fontSize: '18px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Builder Modal */}
      {showAlertBuilder && (
        <div className="modal_overlay" onClick={handleAlertBuilderCancel} onWheel={(e) => e.stopPropagation()}>
          <div className="modal_content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <AlertBuilder
              vessel={selectedVessel}
              existingRule={editingRule}
              onSave={handleAlertBuilderSave}
              onCancel={handleAlertBuilderCancel}
            />
          </div>
        </div>
      )}

      {editingVessel && (
        <VesselSettingsModal
          vessel={editingVessel}
          onClose={() => setEditingVessel(null)}
          onSave={handleVesselSave}
        />
      )}
    </div>
  );
}

export default Cstar;

//next steps
//1. add alert builder functionality
//2. add alert builder saving functionality
//3. add alert builder deletion functionality
//4. add alert builder editing functionality
//5. add alert builder color coding functionality
//6. add alert builder popup functionality
//7. add alert builder alert functionality
//8. add alert builder geofence functionality
//9. add alert timer functionality
//10. add seperate customizable timer for each alert rule