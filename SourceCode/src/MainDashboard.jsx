import { useState, useEffect } from 'react';
import logo from './Oshen_logo.png';
import './MainDashboard.css';
import Cstar from './Cstar';
import Geofences from './Geofences';
import UserSupport from './UserSupport';
import Settings from './Settings';
import Login from './services/login';
import api from './services/api';

function MainDashboard() {
  const [activeTab, setActiveTab] = useState('cstars');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already authenticated on mount
    const checkAuth = () => {
      const authenticated = api.isAuthenticated();
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setUser(null);
    setActiveTab('cstars');
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#fff'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'cstars':
        return <Cstar />;
      case 'geofences':
        return <Geofences />;
      case 'usersupport':
        return <UserSupport />;
      case 'settings':
        return <Settings />;
      default:
        return <Cstar />;
    }
  };

  return (
    <div className='dashboard_container'>
      <div className="black_bar">
        <div className='logo'>
          <img src={logo} alt="Oshen Logo" className='logo' />
        </div>
        <div className='buttons'>
          <button onClick={() => setActiveTab('cstars')} className={activeTab === 'cstars' ? 'active' : ''}>Cstars</button>
          <button onClick={() => setActiveTab('geofences')} className={activeTab === 'geofences' ? 'active' : ''}>Geofences</button>
          <button onClick={() => setActiveTab('usersupport')} className={activeTab === 'usersupport' ? 'active' : ''}>User support</button>
          <button onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'active' : ''}>Settings</button>
          <button onClick={handleLogout} style={{ marginLeft: 'auto', backgroundColor: '#d32f2f' }}>Logout</button>
        </div>
      </div>
      <div className="content_area">
        {renderContent()}
      </div>
    </div>
  );
}

export default MainDashboard;
