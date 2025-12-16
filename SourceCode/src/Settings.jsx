import React, { useState } from 'react';
import './Settings.css';
import VesselForm from './VesselForm';
import AlertBuilder from './AlertBuilder';

function Settings() {
    const [activeSubTab, setActiveSubTab] = useState('add_vessel');

    const renderSettingsContent = () => {
        switch (activeSubTab) {
            case 'add_vessel':
                return <VesselForm />;
            case 'alert_builder':
                return <AlertBuilder />;
            default:
                return <VesselForm />;
        }
    };

    return (
        <div className="settings_container">
            <div className="settings_sidebar">
                <h2>Settings</h2>
                <button
                    className={`settings_nav_btn ${activeSubTab === 'add_vessel' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('add_vessel')}
                >
                    Add Vessel
                </button>
                <button
                    className={`settings_nav_btn ${activeSubTab === 'alert_builder' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('alert_builder')}
                >
                    Alert Builder
                </button>
            </div>
            <div className="settings_content">
                {renderSettingsContent()}
            </div>
        </div>
    );
}

export default Settings;

//next steps
//1. add vessel saving functionality
//2. add vessel deletion functionality
//3. add vessel editing functionality
//4. add vessel color coding functionality
//5. add vessel popup functionality
//6. add vessel alert functionality
//7. add vessel geofence functionality
//8. add vessel tracking functionality
