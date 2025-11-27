import './Geofences.css';
import React, {useEffect, useRef} from 'react'; 
import L from 'leaflet';


function Geofences() {
  const reference_map = useRef(null);
  // Stores a refernce, so it can be placed later
  const map_instance = useRef(null);
  // Stores the map instance

  useEffect(() => {

    if (map_instance.current) return;

    map_instance.current = L.map(reference_map.current).setView([50.374367, -4.140709], 16);
    // This creates the map instance, setting the view and zoom level as well

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      // This references the original source (where the map came from)
    }).addTo(map_instance.current);
    


  }, []);

  return(
    <div className='content_container'>
      <h1>Geofences Editor</h1>
      <div id='geofence_map' ref={reference_map}></div>
    </div>
  )
}

export default Geofences;