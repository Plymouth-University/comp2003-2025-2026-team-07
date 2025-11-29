import './Geofences.css';
import React, {useEffect, useRef, useState} from 'react'; 
import L, { map } from 'leaflet';


function Geofences() {
  const reference_map = useRef(null);
  // Stores a refernce, so it can be placed later
  const map_instance = useRef(null);
  // Stores the map instance
  const [geofence_points, set_geofence_points] = useState([]);
  // This will allow thw coordinates of the geofence to be stored
  const reference_geofence = useRef(null);
  // Stores the Geofence made

  useEffect(() => {

    if (map_instance.current) return;

    map_instance.current = L.map(reference_map.current).setView([50.374367, -4.140709], 16);
    // This creates the map instance, setting the view and zoom level as well

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      // This references the original source (where the map came from)
    }).addTo(map_instance.current);

    map_instance.current.on('click', function(e) {
      const {lat, lng} = e.latlng
      L.marker([lat, lng]).addTo(map_instance.current);
      set_geofence_points(previous_points => [...previous_points, [lat, lng]]);
      // Adds a marker to indicate a point of the geofence
    });

  }, []);

  useEffect(() => {
    if (geofence_points.length >= 4) {
      reference_geofence.current = L.polygon( geofence_points, {
        // Adds a point and the attributes of the geofence are below
        color: 'yellow',
        fillColor: 'yellow',
        fillOpacity: 0.5,
        weight: 3,
      }).addTo(map_instance.current);
    }
  }, [geofence_points]);

  return(
    <div className='content_container'>
      <h1>Geofences Editor</h1>
      <div id='geofence_map' ref={reference_map}></div>
    </div>
  )
}

export default Geofences;