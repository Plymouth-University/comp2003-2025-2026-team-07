import React, { useState, useEffect } from 'react';
import './Cstar.css';

function Cstar() {
  // Mock data for vessels
  const [vessels, setVessels] = useState([]);

  useEffect(() => {
    // Simulating API fetch
    const mockVessels = [
      {
        id: 1,
        name: 'Ocean Explorer',
        imei: '867530901234567',
        status: 'safe',
        latitude: 50.3755,
        longitude: -4.1427,
        lastUpdate: '2 mins ago'
      },
      {
        id: 2,
        name: 'Sea Guardian',
        imei: '998877665544332',
        status: 'alert',
        latitude: 49.9876,
        longitude: -5.1234,
        lastUpdate: 'Just now'
      },
      {
        id: 3,
        name: 'Coastal Ranger',
        imei: '112233445566778',
        status: 'safe',
        latitude: 50.1234,
        longitude: -3.9876,
        lastUpdate: '15 mins ago'
      },
      {
        id: 4,
        name: 'Deep Blue',
        imei: '556677889900112',
        status: 'offline',
        latitude: 48.5678,
        longitude: -6.7890,
        lastUpdate: '2 hours ago'
      },
      {
        id: 5,
        name: 'Arctic Star',
        imei: '123450987654321',
        status: 'safe',
        latitude: 51.5074,
        longitude: -0.1278,
        lastUpdate: '5 mins ago'
      }
    ];
    setVessels(mockVessels);
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case 'safe': return 'status_safe';
      case 'alert': return 'status_alert';
      case 'offline': return 'status_offline';
      default: return '';
    }
  };

  return (
    <div className='content_container'>
      <div className="vessel_header" style={{ borderBottom: 'none' }}>
        <h1>Fleet Dashboard</h1>
        <div className="status_badge status_safe" style={{ fontSize: '1rem' }}>
          Active Vessels: {vessels.filter(v => v.status !== 'offline').length}
        </div>
      </div>

      <div className="dashboard_grid">
        {vessels.map(vessel => (
          <div key={vessel.id} className="vessel_card">
            <div className="vessel_header">
              <h3 className="vessel_name">{vessel.name}</h3>
              <span className={`status_badge ${getStatusClass(vessel.status)}`}>
                {vessel.status}
              </span>
            </div>
            <div className="vessel_details">
              <div className="detail_row">
                <span className="detail_label">IMEI:</span>
                <span className="detail_value">{vessel.imei}</span>
              </div>
              <div className="detail_row">
                <span className="detail_label">Location:</span>
                <span className="detail_value">{vessel.latitude.toFixed(4)}, {vessel.longitude.toFixed(4)}</span>
              </div>
              <div className="detail_row">
                <span className="detail_label">Last Update:</span>
                <span className="detail_value">{vessel.lastUpdate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Cstar;