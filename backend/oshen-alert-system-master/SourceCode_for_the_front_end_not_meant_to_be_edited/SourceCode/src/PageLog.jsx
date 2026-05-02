import { useState, useEffect, useCallback } from 'react';
import api from './services/api';

const STATUS_META = {
  acknowledged: { label: 'Acknowledged', color: '#4caf50' },
  delivered:    { label: 'Delivered',    color: '#2196F3' },
  sent:         { label: 'Sent',         color: '#a0a0a0' },
  failed:       { label: 'Failed',       color: '#f44336' },
  unknown:      { label: 'Pending',      color: '#757575' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.unknown;
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '0.8rem',
      fontWeight: 600,
      backgroundColor: meta.color + '22',
      color: meta.color,
      border: '1px solid ' + meta.color + '55',
      whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

function PageLog({ currentUser }) {
  const [logs, setLogs]               = useState([]);
  const [vessels, setVessels]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [filterVessel, setFilterVessel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [refreshingId, setRefreshingId] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const isAdmin = currentUser?.role === 'admin';
  const isSupervisor = currentUser?.role === 'supervisor' || isAdmin;

  const loadLogs = useCallback(async () => {
    try {
      const filters = { limit: 50 };
      if (filterVessel) filters.vessel_id = filterVessel;
      if (filterStatus) filters.status    = filterStatus;
      const res = await api.getPageLog(filters);
      setLogs(res?.data || []);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load page log');
    } finally {
      setLoading(false);
    }
  }, [filterVessel, filterStatus]);

  useEffect(() => {
    api.getVessels()
      .then(res => setVessels(res?.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    loadLogs();
    const interval = setInterval(loadLogs, 30000);
    return () => clearInterval(interval);
  }, [loadLogs]);

  const handleRefreshRow = async (id) => {
    setRefreshingId(id);
    try {
      const res = await api.refreshPageLogEntry(id);
      if (res?.data) {
        setLogs(prev => prev.map(row => row.id === id ? { ...row, ...res.data } : row));
      }
    } catch (err) {
      // silently fail — row stays as-is
    } finally {
      setRefreshingId(null);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (!isSupervisor) {
    return (
      <div className="content_container">
        <p style={{ color: '#f44336', marginTop: '40px', textAlign: 'center' }}>
          Supervisor or Admin access required to view the page log.
        </p>
      </div>
    );
  }

  return (
    <div className="content_container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#fff' }}>Recent Pages</h1>
          <p style={{ margin: '4px 0 0', color: '#a0a0a0', fontSize: '0.9rem' }}>
            Every page sent by the system — updates every 30 seconds
            {lastRefreshed && (
              <span style={{ marginLeft: '10px', color: '#555' }}>
                · Last refreshed {lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); loadLogs(); }}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(33,150,243,0.15)',
            border: '1px solid #2196F3',
            borderRadius: '6px',
            color: '#2196F3',
            cursor: 'pointer',
            fontSize: '0.88rem',
          }}
        >
          ↻ Refresh Now
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <select
          value={filterVessel}
          onChange={e => setFilterVessel(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Vessels</option>
          {vessels.map(v => (
            <option key={v.id} value={v.id}>{v.name || v.vessel_name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Statuses</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="delivered">Delivered</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(244,67,54,0.1)', border: '1px solid #f44336', borderRadius: '8px', color: '#f44336', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#a0a0a0' }}>
          <div style={spinnerStyle}></div>
          <p>Loading page log…</p>
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#555' }}>
          <p style={{ fontSize: '1.1rem' }}>No pages found</p>
          <p style={{ fontSize: '0.85rem' }}>Pages appear here once the system sends an alert via Pagem.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {['Time Sent','Vessel','Supervisor','Pager ID','Message','Status','Acknowledged At',''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#a0a0a0', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(row => (
                <tr
                  key={row.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <td style={cellStyle}>{formatTime(row.sent_at)}</td>
                  <td style={{ ...cellStyle, color: '#e0e0e0', fontWeight: 500 }}>
                    {row.vessel_name || '—'}
                  </td>
                  <td style={cellStyle}>{row.supervisor_name || '—'}</td>
                  <td style={{ ...cellStyle, fontFamily: 'monospace', color: '#a0a0a0' }}>{row.pagee_id || '—'}</td>
                  <td style={{ ...cellStyle, maxWidth: '220px' }}>
                    <span title={row.message} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#ccc' }}>
                      {row.message || '—'}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <StatusBadge status={row.status} />
                  </td>
                  <td style={{ ...cellStyle, color: row.acknowledged_at ? '#4caf50' : '#555' }}>
                    {row.acknowledged_at ? formatTime(row.acknowledged_at) : '—'}
                  </td>
                  <td style={cellStyle}>
                    {isAdmin && row.status !== 'acknowledged' && row.status !== 'failed' && (
                      <button
                        onClick={() => handleRefreshRow(row.id)}
                        disabled={refreshingId === row.id}
                        title="Poll Pagem for latest status"
                        style={{
                          padding: '4px 10px',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '5px',
                          color: refreshingId === row.id ? '#555' : '#a0a0a0',
                          cursor: refreshingId === row.id ? 'not-allowed' : 'pointer',
                          fontSize: '0.82rem',
                        }}
                      >
                        {refreshingId === row.id ? '…' : '↻'}
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
  );
}

const cellStyle = {
  padding: '10px 12px',
  color: '#c0c0c0',
  verticalAlign: 'middle',
};

const selectStyle = {
  padding: '7px 12px',
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '6px',
  color: '#e0e0e0',
  fontSize: '0.88rem',
  cursor: 'pointer',
};

const spinnerStyle = {
  width: '28px',
  height: '28px',
  border: '3px solid rgba(255,255,255,0.1)',
  borderTop: '3px solid #38bdf8',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  margin: '0 auto 12px',
};

export default PageLog;