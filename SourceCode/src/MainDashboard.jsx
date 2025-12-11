import { useState } from 'react';
import logo from './Oshen_logo.png';
import './MainDashboard.css';
import Cstar from './Cstar';
import Geofences from './Geofences';
import UserSupport from './UserSupport';
import Settings from './Settings';

function MainDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('cstars');

  const renderContent = () => {
    switch (activeTab) {
      case 'cstars':
        return <Cstar currentUser={user} />;
      case 'geofences':
        return <Geofences />;
      case 'usersupport':
        return <UserSupport currentUser={user} />;
      case 'settings':
        return <Settings />;
      default:
        return <Cstar currentUser={user} />;
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
          <button onClick={onLogout} style={{ marginLeft: 'auto', backgroundColor: '#d32f2f' }}>Logout</button>
        </div>
      </div>
      <div className="content_area">
        {renderContent()}
      </div>
    </div>
  );
}

export default MainDashboard;
