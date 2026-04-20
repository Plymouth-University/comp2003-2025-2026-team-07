import { useState, useEffect } from 'react';
import './UserSupport.css';
import UserForm from './UserForm';
import api from './services/api';

function TriggerTestAlertPanel() {
  const [vessels, setVessels]   = useState([]);
  const [vesselId, setVesselId] = useState('');
  const [message, setMessage]   = useState('');
  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState(null); // { type: 'success'|'warn'|'error', text, pages }

  useEffect(() => {
    api.getVessels()
      .then(res => setVessels(res?.data || []))
      .catch(() => {});
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!vesselId) return;
    setSending(true);
    setResult(null);
    try {
      const res = await api.triggerTestAlert(vesselId, message.trim() || undefined);
      const d = res?.data;
      const paged = d?.pagesDispatched || [];
      const successCount = paged.filter(p => p.success).length;
      if (successCount > 0) {
        setResult({
          type: 'success',
          text: `Alert created · ${successCount} page${successCount !== 1 ? 's' : ''} dispatched`,
          pages: paged,
        });
      } else if (paged.length === 0) {
        setResult({ type: 'warn', text: 'Alert created but no supervisors with a pager ID were found.', pages: [] });
      } else {
        setResult({ type: 'warn', text: 'Alert created but all pages failed to send.', pages: paged });
      }
    } catch (err) {
      setResult({ type: 'error', text: err.message || 'Failed to trigger test alert' });
    } finally {
      setSending(false);
    }
  };

  const colors = { success: '#4caf50', warn: '#ff9800', error: '#f44336' };

  return (
    <div style={{
      marginBottom: '20px',
      padding: '16px 20px',
      backgroundColor: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
    }}>
      <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#fff' }}>Trigger Test Alert</h3>
      <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#a0a0a0' }}>
        Creates a real alert record and pages all supervisors for the selected vessel — exercises the exact same code path as a live alert.
      </p>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1', minWidth: '180px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: '#a0a0a0', marginBottom: '4px' }}>Vessel</label>
          <select
            value={vesselId}
            onChange={e => setVesselId(e.target.value)}
            required
            style={{
              width: '100%', padding: '8px 12px',
              backgroundColor: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px', color: '#fff', fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Select vessel…</option>
            {vessels.map(v => (
              <option key={v.id} value={v.id}>{v.name || v.vessel_name} ({v.imei})</option>
            ))}
          </select>
        </div>
        <div style={{ flex: '2', minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: '#a0a0a0', marginBottom: '4px' }}>
            Message <span style={{ color: '#555' }}>(optional)</span>
          </label>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Leave blank for default test message"
            style={{
              width: '100%', padding: '8px 12px',
              backgroundColor: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px', color: '#fff', fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={sending || !vesselId}
          style={{
            padding: '8px 18px',
            backgroundColor: sending || !vesselId ? 'rgba(33,150,243,0.3)' : '#2196F3',
            color: '#fff', border: 'none', borderRadius: '6px',
            cursor: sending || !vesselId ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem', whiteSpace: 'nowrap',
          }}
        >
          {sending ? 'Sending…' : 'Send Test Alert'}
        </button>
      </form>

      {result && (
        <div style={{
          marginTop: '12px', padding: '10px 14px',
          backgroundColor: colors[result.type] + '1a',
          border: '1px solid ' + colors[result.type],
          borderRadius: '7px', color: colors[result.type], fontSize: '0.88rem',
        }}>
          <div style={{ fontWeight: 600, marginBottom: result.pages?.length ? '6px' : 0 }}>{result.text}</div>
          {result.pages?.map((p, i) => (
            <div key={i} style={{ fontSize: '0.82rem', color: p.success ? '#4caf50' : '#f44336', marginTop: '3px' }}>
              {p.success ? '✓' : '✗'} {p.supervisor} (Pager {p.pageeId})
              {!p.success && p.error ? ` — ${p.error}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PagemIntegrationPanel() {
  const [status, setStatus] = useState(null);
  const [keyInfo, setKeyInfo] = useState(null);
  const [newKey, setNewKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { type: 'success'|'warn'|'error', text }

  useEffect(() => {
    api.getPagemStatus()
      .then(res => setStatus(res?.data?.status))
      .catch(() => setStatus('error'));
    api.getPagemApiKey()
      .then(res => setKeyInfo(res?.data))
      .catch(() => setKeyInfo(null));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await api.updatePagemApiKey(newKey.trim());
      setNewKey('');
      if (res?.data) setKeyInfo(res.data);
      const s = res?.data?.status;
      if (s === 'connected') {
        setStatus('connected');
        setSaveMsg({ type: 'success', text: 'Key saved and validated — Pagem connected.' });
      } else {
        setStatus('error');
        setSaveMsg({ type: 'warn', text: 'Key saved but Pagem rejected it: ' + (res?.message || 'unknown error') });
      }
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Failed to save: ' + (err.message || 'unknown error') });
    } finally {
      setSaving(false);
    }
  };

  const statusColor = status === 'connected' ? '#4caf50' : status === 'disabled' ? '#ff9800' : '#f44336';
  const statusLabel = status === 'connected' ? 'Connected' : status === 'disabled' ? 'Disabled' : status ? 'Error' : 'Checking…';

  const msgColors = { success: '#4caf50', warn: '#ff9800', error: '#f44336' };

  const lastUpdated = keyInfo?.updatedAt
    ? new Date(keyInfo.updatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div style={{
      marginBottom: '20px',
      padding: '16px 20px',
      backgroundColor: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#fff' }}>Pagem Integration</h3>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '0.9rem' }}>
        <div>
          <span style={{ color: '#a0a0a0' }}>Status: </span>
          <span style={{ color: statusColor }}>● {statusLabel}</span>
        </div>
        {keyInfo?.maskedKey && (
          <div>
            <span style={{ color: '#a0a0a0' }}>Key: </span>
            <span style={{ fontFamily: 'monospace', color: '#e0e0e0' }}>{keyInfo.maskedKey}</span>
          </div>
        )}
        {keyInfo?.source && (
          <div>
            <span style={{ color: '#a0a0a0' }}>Source: </span>
            <span style={{ color: '#e0e0e0', textTransform: 'capitalize' }}>{keyInfo.source}</span>
            {lastUpdated && <span style={{ color: '#757575' }}> · Last updated: {lastUpdated}</span>}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '260px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '4px' }}>
            New API Key
          </label>
          <input
            type="password"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="new-password"
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={saving || !newKey.trim()}
          style={{
            marginTop: '22px',
            padding: '8px 18px',
            backgroundColor: saving || !newKey.trim() ? 'rgba(33,150,243,0.4)' : '#2196F3',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: saving || !newKey.trim() ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap',
          }}
        >
          {saving ? 'Saving…' : 'Save & Validate'}
        </button>
      </form>

      {saveMsg && (
        <div style={{
          marginTop: '10px',
          padding: '8px 12px',
          backgroundColor: msgColors[saveMsg.type] + '1a',
          border: '1px solid ' + msgColors[saveMsg.type],
          borderRadius: '6px',
          color: msgColors[saveMsg.type],
          fontSize: '0.88rem',
        }}>
          {saveMsg.text}
        </div>
      )}
    </div>
  );
}

function UserSupport({ currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = currentUser && currentUser.role === 'admin';
  const isSupervisor = currentUser && currentUser.role === 'supervisor';
  const canViewUsers = isAdmin || isSupervisor;

  useEffect(() => {
    if (canViewUsers) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [canViewUsers]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getAllUsers();
      setUsers(response.data || []);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (newUser) => {
    try {
      await api.createUser(newUser);
      setShowModal(false);
      // Reload users list
      await loadUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      alert('Failed to create user: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteUser = async (userId) => {
    // Double check they can't delete themselves
    if (userId === currentUser.id) {
      alert('You cannot delete your own account!');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await api.deleteUser(userId);
        // Remove from local state
        setUsers(users.filter(user => user.id !== userId));
      } catch (err) {
        console.error('Error deleting user:', err);
        alert('Failed to delete user: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const getRoleClass = (role) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'role_admin';
      case 'supervisor': return 'role_supervisor';
      default: return 'role_viewer';
    }
  };

  if (loading) {
    return (
      <div className='content_container'>
        <div className="loading_container">
          <div className="loading_spinner"></div>
          <p className="loading_text">Loading users...</p>
        </div>
      </div>
    );
  }

  if (!canViewUsers) {
    return (
      <div className='content_container'>
        <div className="user_header">
          <div>
            <h1>User Management</h1>
            <p style={{ color: '#f44336', margin: '5px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Supervisor or Admin access required to view users
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='content_container'>
      <div className="user_header">
        <div>
          <h1>User Management</h1>
          <p style={{ color: '#a0a0a0', margin: '5px 0 0 0' }}>
            {isAdmin ? 'Manage team access and roles' : 'View team members (read-only)'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn_primary" onClick={() => setShowModal(true)}>
            + Add User
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          border: '1px solid #f44336',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#f44336'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {isAdmin && <PagemIntegrationPanel />}
      {isAdmin && <TriggerTestAlertPanel />}

      <div className="user_table_container">
        <table className="user_table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Pager ID</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const isCurrentUser = user.id === currentUser.id;
              return (
                <tr key={user.id} style={isCurrentUser ? { backgroundColor: 'rgba(33, 150, 243, 0.1)' } : {}}>
                  <td>
                    {user.username}
                    {isCurrentUser && (
                      <span style={{
                        marginLeft: '10px',
                        color: '#2196F3',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>
                        (You)
                      </span>
                    )}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role_badge ${getRoleClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.pager_id
                      ? <span style={{ fontFamily: 'monospace' }}>{user.pager_id}</span>
                      : <span style={{ color: '#ff9800' }}>⚠ Not set</span>
                    }
                  </td>
                  {isAdmin && (
                    <td>
                      {!isCurrentUser ? (
                        <>
                          {/* <button className="action_btn">Edit</button> */}
                          <button
                            className="action_btn delete"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span style={{ color: '#757575', fontSize: '0.9rem' }}>
                          Cannot delete self
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="empty_state">
            <div className="empty_state_icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h4>No users found</h4>
            <p>Add team members using the Add User button above.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal_overlay">
          <div className="modal_content">
            <UserForm
              onCancel={() => setShowModal(false)}
              onSave={handleAddUser}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default UserSupport;