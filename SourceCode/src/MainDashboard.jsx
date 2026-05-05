import { useState, useEffect, useCallback } from 'react';
import logo from './Oshen_logo.png';
import './MainDashboard.css';
import Cstar from './Cstar';
import Geofences from './Geofences';
import UserSupport from './UserSupport';
import Settings from './Settings';
import PageLog from './PageLog';
import api from './services/api';

function NotificationBar({ user, onViewLog }) {
  const [summary, setSummary] = useState(null); // { total, unacked }
  const [dismissed, setDismissed] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await api.getPageLog({ limit: 50 });
      const logs = res?.data || [];
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const recent = logs.filter(l => new Date(l.sent_at).getTime() > cutoff);
      if (recent.length === 0) { setSummary(null); return; }
      const unacked = recent.filter(l => l.status !== 'acknowledged' && l.status !== 'failed').length;
      setSummary({ total: recent.length, unacked });
    } catch {
      // silently ignore — bar just hides
    }
  }, []);

  useEffect(() => {
    const isSuper = user?.role === 'admin' || user?.role === 'supervisor';
    if (!isSuper) return;
    poll();
    const iv = setInterval(poll, 60000);
    return () => clearInterval(iv);
  }, [user, poll]);

  if (!summary || dismissed) return null;

  const hasUnacked = summary.unacked > 0;
  const barColor = hasUnacked ? '#ff9800' : '#2196F3';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      padding: '6px 20px',
      backgroundColor: barColor + '18',
      borderBottom: '1px solid ' + barColor + '55',
      fontSize: '0.85rem',
      color: barColor,
      position: 'relative',
    }}>
      <span>📟</span>
      <span>
        {summary.total} page{summary.total !== 1 ? 's' : ''} sent in the last 24 h
        {hasUnacked && <strong> · {summary.unacked} unacknowledged</strong>}
      </span>
      <button
        onClick={onViewLog}
        style={{
          background: 'none',
          border: '1px solid ' + barColor + '88',
          borderRadius: '4px',
          color: barColor,
          cursor: 'pointer',
          padding: '2px 10px',
          fontSize: '0.82rem',
        }}
      >
        View Log →
      </button>
      <button
        onClick={() => setDismissed(true)}
        title="Dismiss"
        style={{
          position: 'absolute',
          right: '12px',
          background: 'none',
          border: 'none',
          color: barColor,
          cursor: 'pointer',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '2px 6px',
          opacity: 0.7,
        }}
      >
        ✕
      </button>
    </div>
  );
}

function MainDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('cstars');
  const [notifHistory,    setNotifHistory]    = useState([]);
  const [historyOpen,     setHistoryOpen]     = useState(false);
  const [lastOpenedCount, setLastOpenedCount] = useState(0);

  const handleNewAlert = (entry) => {
    setNotifHistory(prev => [entry, ...prev]);
  };

  const unreadCount = notifHistory.length - lastOpenedCount;

  const isAdmin      = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor' || isAdmin;

  const renderContent = () => {
    switch (activeTab) {
      case 'cstars':       return <Cstar currentUser={user} onNewAlert={handleNewAlert} />;
      case 'geofences':    return <Geofences currentUser={user} />;
      case 'usersupport':  return <UserSupport currentUser={user} />;
      case 'settings':     return <Settings />;
      case 'pagelog':      return <PageLog currentUser={user} />;
      default:             return <Cstar currentUser={user} onNewAlert={handleNewAlert} />;
    }
  };

  return (
    <div className='dashboard_container'>
      <div className="black_bar">
        <div className='logo'>
          <img src={logo} alt="Oshen Logo" className='logo' />
        </div>
        <div className='buttons'>
          <button onClick={() => setActiveTab('cstars')}      className={activeTab === 'cstars'      ? 'active' : ''}>CSTARS</button>
          <button onClick={() => setActiveTab('geofences')}   className={activeTab === 'geofences'   ? 'active' : ''}>GEOFENCES</button>
          <button onClick={() => setActiveTab('usersupport')} className={activeTab === 'usersupport' ? 'active' : ''}>USER SUPPORT</button>
          <button onClick={() => setActiveTab('settings')}    className={activeTab === 'settings'    ? 'active' : ''}>SETTINGS</button>
          {isSupervisor && (
            <button onClick={() => setActiveTab('pagelog')} className={activeTab === 'pagelog' ? 'active' : ''}>PAGE LOG</button>
          )}
          <button
            onClick={() => {
              setHistoryOpen(v => {
                if (!v) setLastOpenedCount(notifHistory.length);
                return !v;
              });
            }}
            style={{
              marginLeft: 'auto',
              position: 'relative',
              background: historyOpen ? 'rgba(33,150,243,0.2)' : 'none',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: '1.1rem',
              lineHeight: 1,
            }}
            title="Alert notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                backgroundColor: '#f44336',
                color: '#fff',
                borderRadius: '50%',
                fontSize: '0.65rem',
                fontWeight: 700,
                minWidth: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={onLogout} style={{ backgroundColor: '#d32f2f' }}>LOGOUT</button>
        </div>
      </div>

      {historyOpen && (
        <div style={{
          position: 'absolute',
          top: '58px',
          right: '12px',
          width: '360px',
          maxHeight: '420px',
          backgroundColor: '#1e1e1e',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>Alert Notifications</span>
            <button
              onClick={() => { setNotifHistory([]); setLastOpenedCount(0); }}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px' }}
            >
              Clear all
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifHistory.length === 0 ? (
              <p style={{ color: '#555', textAlign: 'center', padding: '30px 16px', fontSize: '0.88rem' }}>
                No alerts yet this session.
              </p>
            ) : (
              notifHistory.map((n, i) => (
                <div key={n.notifId || i} style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.82rem' }}>
                      {n.vessels?.name || n.vessel_name || 'Unknown Vessel'}
                    </span>
                    <span style={{ color: '#555', fontSize: '0.75rem' }}>
                      {n.notifId ? new Date(parseInt(n.notifId.split('_')[1])).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <span style={{ color: '#ccc', fontSize: '0.83rem', lineHeight: 1.4 }}>
                    {n.message || n.alert_message || '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isSupervisor && (
        <NotificationBar user={user} onViewLog={() => setActiveTab('pagelog')} />
      )}

      <div className="content_area">
        {renderContent()}
      </div>
    </div>
  );
}

export default MainDashboard;
