// src/Geofences.jsx - DRAWING VERSION
import './Geofences.css';
import React, { useEffect, useRef, useState } from 'react'; 
import L from 'leaflet';

function Geofences() {
  const reference_map = useRef(null);
  const map_instance = useRef(null);
  const [geofence_points, set_geofence_points] = useState([]);
  const reference_geofence = useRef(null);

  useEffect(() => {
    if (map_instance.current) return;
    
    map_instance.current = L.map(reference_map.current).setView([50.374367, -4.140709], 16);
    
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map_instance.current);
    
    map_instance.current.on('click', function(e) {
      const { lat, lng } = e.latlng;
      L.marker([lat, lng]).addTo(map_instance.current);
      set_geofence_points(previous_points => [...previous_points, [lat, lng]]);
    });
  }, []);

  useEffect(() => {
    if (geofence_points.length >= 4) {
      if (reference_geofence.current) {
        map_instance.current.removeLayer(reference_geofence.current);
      }
      
      reference_geofence.current = L.polygon(geofence_points, {
        color: 'yellow',
        fillColor: 'yellow',
        fillOpacity: 0.5,
        weight: 3,
      }).addTo(map_instance.current);
    }
  }, [geofence_points]);

  const handleClear = () => {
    if (reference_geofence.current) {
      map_instance.current.removeLayer(reference_geofence.current);
    }
    map_instance.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map_instance.current.removeLayer(layer);
      }
    });
    set_geofence_points([]);
  };

  return (
    <div className='content_container'>
      <h1>Geofences Editor</h1>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={handleClear} style={{
          padding: '10px 20px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '1rem'
        }}>
          Clear Geofence
        </button>
        <span style={{ marginLeft: '20px', color: '#ccc' }}>
          Points: {geofence_points.length} {geofence_points.length >= 4 ? '✓' : '(need 4+)'}
        </span>
      </div>
      <div id='geofence_map' ref={reference_map}></div>
    </div>
  );
}

export default Geofences;