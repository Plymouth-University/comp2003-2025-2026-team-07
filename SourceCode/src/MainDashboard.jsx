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

  const isAdmin      = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor' || isAdmin;

  const renderContent = () => {
    switch (activeTab) {
      case 'cstars':       return <Cstar currentUser={user} />;
      case 'geofences':    return <Geofences currentUser={user} />;
      case 'usersupport':  return <UserSupport currentUser={user} />;
      case 'settings':     return <Settings />;
      case 'pagelog':      return <PageLog currentUser={user} />;
      default:             return <Cstar currentUser={user} />;
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
          <button onClick={onLogout} style={{ marginLeft: 'auto', backgroundColor: '#d32f2f' }}>LOGOUT</button>
        </div>
      </div>

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
