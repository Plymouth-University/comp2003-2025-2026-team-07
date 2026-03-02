// src/Geofences.jsx - Fleet Map with Geofences
import './Geofences.css';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import api from './services/api';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function Geofences() {
  const reference_map = useRef(null);
  const map_instance = useRef(null);
  const [geofence_points, set_geofence_points] = useState([]);
  const reference_geofence = useRef(null);
  const vessel_markers_ref = useRef([]);

  const [vessels, setVessels] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawMode, setDrawMode] = useState(false);

  // Create custom icons for vessels
  const createVesselIcon = (status) => {
    const colors = {
      safe: '#4CAF50',
      alert: '#f44336',
      offline: '#757575'
    };

    return L.divIcon({
      className: 'custom-vessel-marker',
      html: `
        <div style="
          background-color: ${colors[status] || colors.offline};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        ">
          🚢
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
  };

  // Initialize map - runs once when component mounts
  useEffect(() => {
    // Don't re-initialize if map already exists or ref not ready
    if (map_instance.current || !reference_map.current) return;

    console.log('Initializing map...');

    // Center on UK waters initially
    map_instance.current = L.map(reference_map.current).setView([50.374367, -4.140709], 8);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map_instance.current);

    console.log('Map initialized successfully');

    // Click handler for drawing geofence points
    map_instance.current.on('click', function (e) {
      if (drawMode) {
        const { lat, lng } = e.latlng;
        const marker = L.marker([lat, lng], {
          icon: L.icon({
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
          })
        }).addTo(map_instance.current);

        set_geofence_points(previous_points => [...previous_points, { marker, coords: [lat, lng] }]);
      }
    });
  }, [drawMode]);

  // Load vessels and geofences
  useEffect(() => {
    const loadData = async () => {
      try {
        // Don't show loading on refresh (only on initial load)
        if (vessels.length === 0) {
          setLoading(true);
        }

        // Fetch vessels
        const vesselsResponse = await api.getVessels();
        const vesselsData = vesselsResponse.data || [];
        console.log('Loaded vessels:', vesselsData);
        console.log('Vessels with positions:', vesselsData.filter(v => v.latest_position).length);
        setVessels(vesselsData);

        // Fetch geofences
        try {
          const geofencesResponse = await api.getGeofences();
          setGeofences(geofencesResponse.data || []);
        } catch (err) {
          console.log('No geofences found or error loading geofences');
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Display vessels on map
  useEffect(() => {
    if (!map_instance.current || !vessels.length) {
      console.log('Cannot display vessels:', {
        hasMap: !!map_instance.current,
        vesselsCount: vessels.length
      });
      return;
    }

    console.log('Displaying vessels on map...');

    // Clear existing vessel markers
    vessel_markers_ref.current.forEach(marker => {
      map_instance.current.removeLayer(marker);
    });
    vessel_markers_ref.current = [];

    // Add new vessel markers
    let vesselsWithPositions = 0;
    vessels.forEach(vessel => {
      console.log(`Vessel ${vessel.name}:`, {
        hasLatestPosition: !!vessel.latest_position,
        position: vessel.latest_position
      });

      if (vessel.latest_position && vessel.latest_position.latitude && vessel.latest_position.longitude) {
        vesselsWithPositions++;
        const lat = parseFloat(vessel.latest_position.latitude);
        const lng = parseFloat(vessel.latest_position.longitude);

        const status = getVesselStatus(vessel);
        const icon = createVesselIcon(status);

        const marker = L.marker([lat, lng], { icon })
          .bindPopup(`
            <div style="color: #fff;">
              <h3 style="margin: 0 0 8px 0; color: #4CAF50;">${vessel.name}</h3>
              <p style="margin: 4px 0;"><strong>IMEI:</strong> ${vessel.imei}</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: ${getStatusColor(status)}">${status.toUpperCase()}</span></p>
              <p style="margin: 4px 0;"><strong>Position:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
              <p style="margin: 4px 0;"><strong>Last Check-in:</strong> ${getLastUpdateText(vessel.last_check_in_at)}</p>
              ${vessel.emergency_alert_active ? '<p style="margin: 4px 0; color: #f44336;"><strong>🚨 EMERGENCY ALERT ACTIVE</strong></p>' : ''}
            </div>
          `)
          .addTo(map_instance.current);

        vessel_markers_ref.current.push(marker);
      }
    });

    console.log(`Added ${vesselsWithPositions} vessel markers to map out of ${vessels.length} total vessels`);

    // Auto-fit map to show all vessels if we have any
    if (vessel_markers_ref.current.length > 0) {
      const group = L.featureGroup(vessel_markers_ref.current);
      const bounds = group.getBounds();
      console.log('Fitting map to bounds:', bounds);
      map_instance.current.fitBounds(bounds.pad(0.1));
    } else {
      console.log('No vessels with positions to display on map');
    }
  }, [vessels]);

  // Display geofences on map
  useEffect(() => {
    if (!map_instance.current || !geofences.length) return;

    geofences.forEach(geofence => {
      if (geofence.coordinates && geofence.coordinates.length >= 3) {
        const coords = geofence.coordinates.map(coord => [coord.latitude, coord.longitude]);

        L.polygon(coords, {
          color: '#2196F3',
          fillColor: '#2196F3',
          fillOpacity: 0.2,
          weight: 2,
        })
          .bindPopup(`
          <div style="color: #fff;">
            <h3 style="margin: 0 0 8px 0; color: #2196F3;">${geofence.name}</h3>
            <p style="margin: 4px 0;">${geofence.description || 'No description'}</p>
            <p style="margin: 4px 0;"><strong>Type:</strong> ${geofence.type}</p>
          </div>
        `)
          .addTo(map_instance.current);
      }
    });
  }, [geofences]);

  // Draw geofence polygon
  useEffect(() => {
    if (geofence_points.length >= 3) {
      // this defines that a minimum of 3 points are required for the creation of a geofence

      if (reference_geofence.current) {
        map_instance.current.removeLayer(reference_geofence.current);
      }
      // currently, this gets rid of the previous geofence when a new one is drawn
      // this is intended to change so that multiple geofences can be created

      const coords = geofence_points.map(p => p.coords);
      reference_geofence.current = L.polygon(coords, {
        color: 'yellow',
        fillColor: 'yellow',
        fillOpacity: 0.3,
        weight: 3,
      }).addTo(map_instance.current);
      //this defines the geofence's visual aspects
    }
  }, [geofence_points]);

  const getVesselStatus = (vessel) => {
    if (vessel.emergency_alert_active) return 'alert';
    if (!vessel.at_sea_status) return 'offline';
    if (!vessel.last_check_in_at) return 'offline';

    const lastCheckIn = new Date(vessel.last_check_in_at);
    const now = new Date();
    const hoursSinceCheckIn = (now - lastCheckIn) / (1000 * 60 * 60);

    if (hoursSinceCheckIn > 1) return 'offline';
    return 'safe';
  };
  // gets the actual status of the vessel, its passed to the function below

  const getStatusColor = (status) => {
    switch (status) {
      case 'safe': return '#4CAF50';
      case 'alert': return '#f44336';
      case 'offline': return '#757575';
      default: return '#757575';
    }
  };
  // this makes it easy to see the staus of a vessel

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
  // this makes it apparent when the last update was made

  const handleClear = () => {
    if (reference_geofence.current) {
      map_instance.current.removeLayer(reference_geofence.current);
      reference_geofence.current = null;
    }

    geofence_points.forEach(point => {
      if (point.marker) {
        map_instance.current.removeLayer(point.marker);
      }
    });

    set_geofence_points([]);
  };

  const toggleDrawMode = () => {
    setDrawMode(!drawMode);
    if (drawMode) {
      handleClear();
    }
  };

  return (
    <div className='content_container'>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h1>Fleet Map & Geofences</h1>
        <div style={{ color: '#ccc' }}>
          {loading ? '🔄 Loading...' : `🚢 ${vessels.filter(v => getVesselStatus(v) !== 'offline').length} / ${vessels.length} Vessels Active`}
        </div>
      </div>

      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={toggleDrawMode} style={{
          padding: '10px 20px',
          backgroundColor: drawMode ? '#4CAF50' : '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '1rem'
        }}>
          {drawMode ? '✓ Drawing Mode ON' : '✏️ Enable Drawing Mode'}
        </button>

        {drawMode && (
          <>
            <button onClick={handleClear} style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}>
              Clear Points
            </button>
            <span style={{ color: '#ccc' }}>
              Points: {geofence_points.length} {geofence_points.length >= 3 ? '✓' : '(need 3+)'}
            </span>
          </>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '15px', fontSize: '0.9rem' }}>
          <span><span style={{ color: '#4CAF50' }}>●</span> Safe</span>
          <span><span style={{ color: '#f44336' }}>●</span> Alert</span>
          <span><span style={{ color: '#757575' }}>●</span> Offline</span>
        </div>
      </div>

      <div id='geofence_map' ref={reference_map}></div>
    </div>
  );
}

export default Geofences;

//next steps
//1. add geofence drawing functionality
//2. add geofence saving functionality
//3. add geofence deletion functionality
//4. add geofence editing functionality
//5. add geofence color coding functionality
//6. add geofence popup functionality
//7. add geofence alert functionality
//8. change the map to a fleet map
