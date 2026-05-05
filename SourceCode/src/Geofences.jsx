/**
 * Geofences.jsx — Fleet Map & Geofence Management
 *
 * This is the main map page of the OSHEN dashboard. It combines three things:
 *   1. Live vessel positions — markers update every 30 seconds, colour-coded by status.
 *   2. Geofence zones      — polygons drawn by the user and stored via the backend API.
 *   3. Vessel trackback    — clicking a vessel loads its historical GPS path for a
 *                            chosen time period (24 H → 30 D, or a custom number of days).
 *
 * Map library : Leaflet (via the 'leaflet' npm package)
 * Tile sources: OpenStreetMap (default) · ESRI Ocean · ESRI Satellite · OpenSeaMap overlays
 * API calls   : see src/services/api.js for all endpoint wrappers
 */

import './Geofences.css';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import api from './services/api';

// ─── Zone configuration ────────────────────────────────────────────────────────
// Each zone type has a display label, Leaflet polygon colours, and the matching
// geofence_type value that the backend API expects when saving/fetching.
//   keep_in       → vessel should stay inside (Safe Zone)
//   keep_out_zone → vessel should stay outside (Danger / Restricted Zone)
const ZONE_CONFIG = {
  safe: {
    label:       'Safe Zone',
    color:       '#22c55e',      // green border
    fillColor:   '#22c55e',
    fillOpacity: 0.14,
    apiType:     'keep_in'       // backend geofence_type value
  },
  dangerous: {
    label:       'Danger Zone',
    color:       '#ef4444',      // red border
    fillColor:   '#ef4444',
    fillOpacity: 0.14,
    apiType:     'keep_out_zone'
  },
  restricted: {
    label:       'Restricted Zone',
    color:       '#f59e0b',      // amber border
    fillColor:   '#f59e0b',
    fillOpacity: 0.14,
    apiType:     'keep_out_zone'
  }
};

/**
 * Maps an API geofence_type string back to our UI zone key.
 * Both 'dangerous' and 'restricted' share the same API type (keep_out_zone),
 * so we default to 'dangerous' unless localStorage metadata says otherwise.
 */
const getZoneTypeFromApiType = (apiType) =>
  apiType === 'keep_in' ? 'safe' : 'dangerous';

// ─── Track period presets ──────────────────────────────────────────────────────
// These are the quick-select buttons shown in the sidebar (24 H, 3 D, 7 D, 30 D).
// 'hours' is what gets sent to the telemetry API; 'preset' identifies the active button.
const TRACK_PRESETS = [
  { label: '24H',  hours: 24,   preset: '24h' },
  { label: '3D',   hours: 72,   preset: '3d'  },
  { label: '7D',   hours: 168,  preset: '7d'  },
  { label: '30D',  hours: 720,  preset: '30d' },
];

// ─── Zone metadata helpers (localStorage) ─────────────────────────────────────
// The backend geofences table has no 'name' column, so we persist the user-chosen
// zone name and display type (safe / dangerous / restricted) in localStorage under
// the key 'geo_meta', keyed by geofence ID.
// This means names survive page refreshes without any backend schema changes.

/** Save or overwrite the name + zoneType for a given geofence ID. */
const saveZoneMeta = (id, meta) => {
  try {
    const stored = JSON.parse(localStorage.getItem('geo_meta') || '{}');
    stored[id] = meta;
    localStorage.setItem('geo_meta', JSON.stringify(stored));
  } catch (_) {}
};

/** Read the stored name + zoneType for a geofence ID. Returns null if not found. */
const getZoneMeta = (id) => {
  try {
    return JSON.parse(localStorage.getItem('geo_meta') || '{}')[id] || null;
  } catch (_) { return null; }
};

/** Remove stored metadata when a geofence is deleted. */
const removeZoneMeta = (id) => {
  try {
    const stored = JSON.parse(localStorage.getItem('geo_meta') || '{}');
    delete stored[id];
    localStorage.setItem('geo_meta', JSON.stringify(stored));
  } catch (_) {}
};

// ─── Reusable SVG icon components ─────────────────────────────────────────────
// Defined here (outside the component) so they are not re-created on every render.
// Used in the sidebar toolbar and drawing controls.
const IconDraw = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const IconUndo = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 7v6h6"/><path d="M3 13A9 9 0 1 0 5.27 6.27"/></svg>
);
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
);
const IconX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const IconShip = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.25 0 2.45-.2 3.6-.54a9.43 9.43 0 0 0 8.8 0C17.55 22.8 18.75 23 20 23h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.47.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/>
  </svg>
);

// ─── Bearing / direction-of-travel calculation ────────────────────────────────
/**
 * Computes the forward azimuth (bearing) from point A to point B.
 *
 * Returns a value in degrees, 0–360, measured clockwise from true North:
 *   0°  = North  (vessel moving up on the map)
 *   90° = East   (vessel moving right)
 *  180° = South  (vessel moving down)
 *  270° = West   (vessel moving left)
 *
 * This is used to rotate the vessel arrow marker so it always points in the
 * actual direction of travel, calculated from the two most recent telemetry
 * positions rather than relying on a device-reported heading field.
 *
 * Formula: forward azimuth using spherical trigonometry (standard haversine approach).
 */
const computeBearing = (lat1, lng1, lat2, lng2) => {
  const toRad = d => d * Math.PI / 180;
  const dLng  = toRad(lng2 - lng1);
  const rlat1 = toRad(lat1);
  const rlat2 = toRad(lat2);
  const y = Math.sin(dLng) * Math.cos(rlat2);
  const x = Math.cos(rlat1) * Math.sin(rlat2) -
            Math.sin(rlat1) * Math.cos(rlat2) * Math.cos(dLng);
  // atan2 gives -180→+180; we normalise to 0→360
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

// ─── Main Component ────────────────────────────────────────────────────────────
/**
 * Geofences — rendered when the user clicks the "Geofences" tab in the nav bar.
 *
 * Props:
 *   currentUser  – the logged-in user object (from App/MainDashboard).
 *                  Used to conditionally show admin-only controls (Draw, Delete).
 */
function Geofences({ currentUser }) {

  // ── DOM / Leaflet refs ────────────────────────────────────────────────────
  // useRef is used for values that should NOT trigger a re-render when they change.
  // Leaflet map objects and layer arrays fall into this category.

  const reference_map   = useRef(null);   // <div> that Leaflet mounts into
  const map_instance    = useRef(null);   // the L.map() object itself
  const vessel_markers  = useRef([]);     // array of L.marker instances for vessels
  const geo_layers      = useRef({});     // { [geofenceId]: { polygon, label } } — lets us remove specific layers on delete
  const preview_line    = useRef(null);   // dashed polyline shown while drawing (rubber-band)
  const preview_poly    = useRef(null);   // shaded polygon preview while drawing
  const drawn_pts       = useRef([]);     // [[lat, lng], ...] — vertices placed so far in current drawing session
  const track_layers    = useRef([]);     // all Leaflet layers making up the current vessel trackback (polylines + dots)

  // ── Refs that mirror state for use inside Leaflet event handlers ──────────
  // Leaflet event callbacks (onClick, onMouseMove) are registered once in a
  // useEffect with an empty dependency array, meaning they capture the initial
  // state values and never see updates. We solve this with "ref mirrors":
  // the ref is always up to date (synced in a separate useEffect) so handlers
  // can safely read the current value.

  const activeToolRef   = useRef(null);   // mirrors activeTool state
  const drawZoneRef     = useRef('safe'); // mirrors drawZoneType state
  const trackedVesselRef = useRef(null);  // mirrors trackedVessel state (also used to block fitBounds during tracking)

  // ── Tile layer refs ───────────────────────────────────────────────────────
  const base_layer_ref    = useRef(null); // the currently active base tile layer
  const seamark_layer_ref = useRef(null); // OpenSeaMap nautical symbols overlay
  const ocean_ref_ref     = useRef(null); // ESRI Ocean Reference labels overlay (only shown on 'ocean' base)

  // ── React state ───────────────────────────────────────────────────────────
  // Values that, when changed, should cause the UI to re-render.

  const [vessels,        setVessels]        = useState([]);          // vessel list from API
  const [geofences,      setGeofences]      = useState([]);          // geofence list from API
  const [loading,        setLoading]        = useState(true);        // initial data load spinner

  // Drawing tool state
  const [activeTool,     setActiveTool]     = useState(null);        // 'draw' | 'delete' | null
  const [drawZoneType,   setDrawZoneType]   = useState('safe');      // zone type selected in picker
  const [drawPoints,     setDrawPoints]     = useState([]);          // vertex count shown in the hint text

  // Save-zone modal state
  const [showSaveModal,  setShowSaveModal]  = useState(false);
  const [pendingCoords,  setPendingCoords]  = useState([]);          // vertices waiting to be saved
  const [saveForm,       setSaveForm]       = useState({ name: '', zoneType: 'safe', vesselId: '' });
  const [saving,         setSaving]         = useState(false);

  // Vessel trackback state
  const [trackedVessel,  setTrackedVessel]  = useState(null);        // { id, name } of the vessel currently being tracked
  const [trackLoading,   setTrackLoading]   = useState(false);
  const [trackInfo,      setTrackInfo]      = useState(null);        // { points, oldest, newest } for the sidebar panel
  const [trackRange,     setTrackRange]     = useState({ hours: 24, label: '24H', preset: '24h' }); // selected time window
  const [customDays,     setCustomDays]     = useState('');          // value in the custom-days input
  const [customActive,   setCustomActive]   = useState(false);       // whether the Custom preset button is selected

  // Map layer state
  const [activeBaseLayer, setActiveBaseLayer] = useState('nautical'); // 'nautical' | 'ocean' | 'satellite'
  const [showSeamarks,    setShowSeamarks]    = useState(true);       // OpenSeaMap overlay toggle
  const [layersOpen,      setLayersOpen]      = useState(false);      // sidebar MAP LAYERS accordion open/closed

  // Vessel bearing state — computed from telemetry, used to rotate vessel arrow markers
  // Shape: { [vesselId]: bearingDegrees }
  const [vesselBearings,  setVesselBearings]  = useState({});

  // ── Permission check ──────────────────────────────────────────────────────
  const isAdmin = currentUser?.role === 'admin';

  // ── Tile layer definitions ────────────────────────────────────────────────
  // Defined inside the component so they are available in useEffect bodies.
  // All three layers support zoom ≥ 17 for sharp close-up reading except ESRI Ocean (max 13).
  const TILE_LAYERS = {
    nautical: {
      url:         'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | © <a href="https://www.openseamap.org">OpenSeaMap</a>',
      maxZoom:     19,
      label:       'Nautical'
    },
    ocean: {
      // ESRI World Ocean Base — bathymetric (depth) colouring, max zoom 13 only
      url:         'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri — GEBCO, NOAA, NGA',
      maxZoom:     13,
      label:       'Ocean View'
    },
    satellite: {
      // ESRI World Imagery — aerial/satellite photography
      url:         'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri — Esri, USGS, NOAA',
      maxZoom:     19,
      label:       'Satellite'
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS — ordered by lifecycle / dependency
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Sync ref mirrors so Leaflet event handlers always see current state ───
  useEffect(() => { activeToolRef.current  = activeTool;   }, [activeTool]);
  useEffect(() => { drawZoneRef.current    = drawZoneType; }, [drawZoneType]);

  // ── Re-fetch track when the user changes the time window ──────────────────
  // trackRange changes when a preset button or Apply is clicked.
  // If a vessel is already being tracked (ref is set), reload the track for
  // the new period without requiring the user to re-click the vessel.
  useEffect(() => {
    if (trackedVesselRef.current) {
      loadVesselTrack(trackedVesselRef.current, trackRange.hours);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackRange]);

  // ── Map initialisation (runs once after first render) ─────────────────────
  // Leaflet requires a real DOM node, which is only available after mount.
  // The guard `map_instance.current` prevents double-initialisation in React's
  // Strict Mode (which mounts components twice in development).
  useEffect(() => {
    if (map_instance.current || !reference_map.current) return;

    map_instance.current = L.map(reference_map.current, {
      zoomControl: false, // we add a custom-positioned zoom control below
      maxZoom:     19
    }).setView([50.374367, -4.140709], 6); // initial view centred on Plymouth / SW England

    // Custom zoom control — moved to bottom-right to keep top-left clear
    L.control.zoom({ position: 'bottomright' }).addTo(map_instance.current);

    // Default base layer: OpenStreetMap (sharp at all zoom levels up to 19)
    base_layer_ref.current = L.tileLayer(TILE_LAYERS.nautical.url, {
      maxZoom:    19,
      attribution: TILE_LAYERS.nautical.attribution,
      subdomains: ['a','b','c']
    }).addTo(map_instance.current);

    // ESRI Ocean Reference layer — adds depth labels and named features on top of
    // the ESRI Ocean Base. Kept in a ref but NOT added to the map here;
    // it is toggled on/off by the base-layer switcher effect below.
    ocean_ref_ref.current = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 13, opacity: 0.9 }
    );

    // OpenSeaMap seamark overlay — buoys, wrecks, port markers, depth soundings.
    // Added by default; can be toggled with the "Nautical symbols" switch.
    seamark_layer_ref.current = L.tileLayer(
      'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
      { maxZoom: 18, opacity: 0.95 }
    ).addTo(map_instance.current);

  // TILE_LAYERS is defined inside the component but never changes, so omitting
  // it from the dep array is intentional (equivalent to a module-level constant).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Base tile layer switcher ───────────────────────────────────────────────
  // Runs whenever the user picks a different map style from the sidebar.
  // Removes the old base layer, adds the new one, and ensures the Ocean Reference
  // overlay is only present when the Ocean base is active.
  useEffect(() => {
    if (!map_instance.current || !base_layer_ref.current) return;
    const map = map_instance.current;
    const cfg = TILE_LAYERS[activeBaseLayer];

    map.removeLayer(base_layer_ref.current);

    const opts = { maxZoom: cfg.maxZoom, attribution: cfg.attribution };
    if (activeBaseLayer === 'nautical') opts.subdomains = ['a','b','c'];

    base_layer_ref.current = L.tileLayer(cfg.url, opts).addTo(map);
    base_layer_ref.current.bringToBack(); // ensure base stays under overlays

    // Show/hide the ESRI Ocean Reference labels overlay
    if (ocean_ref_ref.current) {
      if (activeBaseLayer === 'ocean') {
        if (!map.hasLayer(ocean_ref_ref.current)) ocean_ref_ref.current.addTo(map);
      } else {
        if (map.hasLayer(ocean_ref_ref.current)) map.removeLayer(ocean_ref_ref.current);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBaseLayer]);

  // ── Seamark (nautical symbols) toggle ─────────────────────────────────────
  useEffect(() => {
    if (!map_instance.current || !seamark_layer_ref.current) return;
    const map = map_instance.current;
    if (showSeamarks) {
      if (!map.hasLayer(seamark_layer_ref.current)) seamark_layer_ref.current.addTo(map);
    } else {
      if (map.hasLayer(seamark_layer_ref.current)) map.removeLayer(seamark_layer_ref.current);
    }
  }, [showSeamarks]);

  // ── Initial data load + 30-second polling ─────────────────────────────────
  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 30000); // refresh vessel positions every 30 s
    return () => clearInterval(iv);          // cleanup on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * loadData — fetches vessels, geofences, and vessel travel bearings in parallel.
   *
   * Uses Promise.allSettled so that a failure on one endpoint (e.g. geofences)
   * does not block the other (e.g. vessels) from updating.
   *
   * After fetching vessel data, we fire getTelemetryHistory(vesselId, 2) for each
   * vessel (in parallel) to compute the direction of travel from the last two GPS
   * fixes. This is what rotates the arrow marker correctly on the map.
   */
  const loadData = async () => {
    try {
      const [vRes, gRes] = await Promise.allSettled([api.getVessels(), api.getGeofences()]);
      const vesselList = vRes.status === 'fulfilled' ? (vRes.value.data || []) : [];
      if (vRes.status === 'fulfilled') setVessels(vesselList);
      if (gRes.status === 'fulfilled') setGeofences(gRes.value.data || []);

      // Compute travel bearing for each vessel using its last 2 telemetry points.
      // All requests are fired in parallel with Promise.allSettled.
      if (vesselList.length > 0) {
        const tResults = await Promise.allSettled(
          vesselList.map(v => api.getTelemetryHistory(v.id, 2))
        );
        const bearings = {};
        tResults.forEach((res, i) => {
          if (res.status !== 'fulfilled') return;
          // Sort chronologically so index [length-2] is second-to-last and [length-1] is latest
          const pts = (res.value.data || [])
            .filter(p => p.latitude && p.longitude)
            .sort((a, b) => new Date(a.timestamp || a.created_at) - new Date(b.timestamp || b.created_at));
          if (pts.length >= 2) {
            const prev = pts[pts.length - 2];
            const curr = pts[pts.length - 1];
            bearings[vesselList[i].id] = computeBearing(
              +prev.latitude, +prev.longitude,
              +curr.latitude, +curr.longitude
            );
          }
        });
        setVesselBearings(bearings);
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  // ── Vessel marker rendering ────────────────────────────────────────────────
  // Runs whenever the vessel list OR computed bearings change.
  // Clears all existing vessel markers and redraws them from scratch.
  useEffect(() => {
    if (!map_instance.current || !vessels.length) return;

    // Remove stale markers from the previous render
    vessel_markers.current.forEach(m => map_instance.current.removeLayer(m));
    vessel_markers.current = [];

    vessels.forEach(vessel => {
      const pos = vessel.latest_position; // JSON blob stored by the backend on each check-in
      if (!pos?.latitude || !pos?.longitude) return; // skip vessels with no position data

      const lat    = parseFloat(pos.latitude);
      const lng    = parseFloat(pos.longitude);
      const status = getVesselStatus(vessel); // 'safe' | 'alert' | 'offline'

      // Heading priority (best available wins):
      //   1. vesselBearings[id]  — computed from last 2 telemetry GPS points (most reliable)
      //   2. pos.course          — course-over-ground reported by the device (if available)
      //   3. pos.heading         — bow heading reported by the device (if available)
      //   4. 0                   — fallback: point North if no data at all
      const heading = vesselBearings[vessel.id] ?? pos?.course ?? pos?.heading ?? 0;

      const marker = L.marker([lat, lng], { icon: createVesselIcon(status, heading) })
        .bindPopup(buildVesselPopup(vessel, lat, lng, status))
        .addTo(map_instance.current);

      // Clicking a vessel loads its trackback path for the selected time period
      marker.on('click', () => loadVesselTrack(vessel));
      vessel_markers.current.push(marker);
    });

    // Auto-fit the map to show all vessels — but only when NOT actively tracking
    // a specific vessel, otherwise the map would jump back to the fleet view every
    // 30 seconds while the user is inspecting an individual track.
    if (vessel_markers.current.length > 0 && !trackedVesselRef.current) {
      const group = L.featureGroup(vessel_markers.current);
      map_instance.current.fitBounds(group.getBounds().pad(0.15));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vessels, vesselBearings]);

  // ── Geofence layer rendering ───────────────────────────────────────────────
  // Runs whenever the geofence list changes (after load or after save/delete).
  // Wipes all existing polygon layers and redraws from the current state array.
  useEffect(() => {
    if (!map_instance.current) return;
    Object.values(geo_layers.current).forEach(({ polygon, label }) => {
      map_instance.current.removeLayer(polygon);
      if (label) map_instance.current.removeLayer(label);
    });
    geo_layers.current = {};
    geofences.forEach(renderGeofenceOnMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geofences]);

  /**
   * renderGeofenceOnMap — draws a single geofence polygon + name label on the map.
   *
   * Important: The backend returns GeoJSON coordinates as [longitude, latitude]
   * (per the GeoJSON spec), but Leaflet expects [latitude, longitude].
   * Every coordinate pair is therefore swapped: c[1], c[0].
   *
   * Muted zones are rendered with a dashed grey outline and reduced opacity
   * to visually indicate that alerts for that zone are currently suppressed.
   */
  const renderGeofenceOnMap = (geofence) => {
    if (!map_instance.current) return;

    // Swap coordinate order: GeoJSON [lng, lat] → Leaflet [lat, lng]
    let coords = [];
    if (geofence.geometry?.type === 'Polygon' && geofence.geometry.coordinates?.[0]) {
      coords = geofence.geometry.coordinates[0].map(c => [c[1], c[0]]);
    } else if (geofence.coordinates?.length >= 3) {
      // Legacy fallback for older API response shape
      coords = geofence.coordinates.map(c => [c.latitude, c.longitude]);
    }
    if (coords.length < 3) return; // a valid polygon needs at least 3 vertices

    // Resolve zone type and display name.
    // localStorage metadata takes priority; falls back to inferring from API type.
    const meta     = getZoneMeta(geofence.id);
    const zoneType = meta?.zoneType || getZoneTypeFromApiType(geofence.geofence_type);
    const zoneName = meta?.name     || `Zone ${geofence.id}`;
    const cfg      = ZONE_CONFIG[zoneType] || ZONE_CONFIG.safe;
    const muted    = geofence.is_muted;

    // Muted zones appear greyed-out with a dashed border
    const polygon = L.polygon(coords, {
      color:       muted ? '#4a4a4a' : cfg.color,
      fillColor:   muted ? '#333'    : cfg.fillColor,
      fillOpacity: muted ? 0.07      : cfg.fillOpacity,
      weight:      muted ? 1.5       : 2,
      dashArray:   muted ? '6 4'     : null
    }).addTo(map_instance.current);

    polygon.bindPopup(buildGeofencePopup(geofence, zoneName, zoneType, cfg, muted));

    // In delete mode, clicking a polygon triggers the delete handler.
    // We read from activeToolRef (not activeTool state) because this handler
    // is a persistent closure — the ref always holds the current value.
    polygon.on('click', () => {
      if (activeToolRef.current === 'delete') {
        handleDeleteGeofence(geofence.id, zoneName);
      }
    });

    // Zone name label — placed at the polygon centroid using a Leaflet divIcon.
    // zIndexOffset: -1000 keeps the label below vessel markers.
    const center    = polygon.getBounds().getCenter();
    const labelIcon = L.divIcon({
      className: 'geofence-label',
      html:      `<div class="gfl-inner gfl-${zoneType}${muted ? ' gfl-muted' : ''}">${zoneName}</div>`,
      iconSize:  null,
      iconAnchor:[0, 0]
    });
    const label = L.marker(center, { icon: labelIcon, interactive: false, zIndexOffset: -1000 })
      .addTo(map_instance.current);

    // Store both layers by ID so we can cleanly remove them on delete
    geo_layers.current[geofence.id] = { polygon, label };
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // POLYGON DRAWING
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Map event listeners for interactive drawing ───────────────────────────
  // Registered once (empty dep array). Active only when activeTool === 'draw'
  // (checked via the ref mirror so handlers always see the current tool).
  useEffect(() => {
    if (!map_instance.current) return;
    const map = map_instance.current;

    // Each click adds one vertex to the current polygon
    const onClick = (e) => {
      if (activeToolRef.current !== 'draw') return;
      const { lat, lng } = e.latlng;
      drawn_pts.current.push([lat, lng]);
      setDrawPoints([...drawn_pts.current]); // update React state so the hint text re-renders
      redrawPreview(drawn_pts.current);
    };

    // Double-click finalises the polygon (if ≥ 3 vertices have been placed)
    const onDblClick = (e) => {
      if (activeToolRef.current !== 'draw') return;
      L.DomEvent.stopPropagation(e); // prevent the double-click from also registering as two single clicks
      if (drawn_pts.current.length >= 3) finishDrawing();
    };

    // Mouse-move shows a "rubber band" preview line from the last vertex to the cursor
    const onMouseMove = (e) => {
      if (activeToolRef.current !== 'draw' || drawn_pts.current.length === 0) return;
      redrawPreview([...drawn_pts.current, [e.latlng.lat, e.latlng.lng]], true);
    };

    map.on('click',     onClick);
    map.on('dblclick',  onDblClick);
    map.on('mousemove', onMouseMove);

    // Cleanup: remove listeners when the component unmounts
    return () => {
      map.off('click',     onClick);
      map.off('dblclick',  onDblClick);
      map.off('mousemove', onMouseMove);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * redrawPreview — updates the dashed preview line and shaded polygon on the map.
   *
   * @param pts         Array of [lat, lng] points to draw (may include the cursor position).
   * @param withCursor  If true, the cursor position is included → use lower opacity
   *                    to distinguish the "live" edge from committed vertices.
   */
  const redrawPreview = (pts, withCursor = false) => {
    const map = map_instance.current;
    if (!map) return;
    const cfg = ZONE_CONFIG[drawZoneRef.current]; // use ref so we always have the current zone type

    // Remove existing preview layers before redrawing
    if (preview_line.current) { map.removeLayer(preview_line.current); preview_line.current = null; }
    if (preview_poly.current) { map.removeLayer(preview_poly.current); preview_poly.current = null; }

    // Draw dashed outline connecting placed vertices (and cursor if provided)
    if (pts.length >= 2) {
      preview_line.current = L.polyline(pts, {
        color: cfg.color, weight: 2, dashArray: '6 4', opacity: withCursor ? 0.65 : 1
      }).addTo(map);
    }

    // Draw shaded polygon fill once 3+ vertices are in place
    if (pts.length >= 3) {
      preview_poly.current = L.polygon(pts, {
        color: cfg.color, fillColor: cfg.fillColor,
        fillOpacity: withCursor ? 0.09 : 0.13, weight: 2, dashArray: '6 4'
      }).addTo(map);
    }
  };

  /**
   * finishDrawing — called when the user double-clicks or presses the Finish button.
   * Clears the preview, captures the vertices, and opens the Save Zone modal.
   */
  const finishDrawing = () => {
    const pts = drawn_pts.current;
    if (pts.length < 3) return;
    clearPreview();
    setPendingCoords([...pts]);
    setSaveForm({ name: '', zoneType: drawZoneType, vesselId: '' });
    setShowSaveModal(true);
    drawn_pts.current = []; // reset for the next drawing session
    setDrawPoints([]);
  };

  /** Removes the dashed preview line and shaded polygon from the map. */
  const clearPreview = () => {
    if (preview_line.current) { map_instance.current?.removeLayer(preview_line.current); preview_line.current = null; }
    if (preview_poly.current) { map_instance.current?.removeLayer(preview_poly.current); preview_poly.current = null; }
  };

  /** Cancels the current drawing session and resets the map cursor. */
  const cancelDrawing = () => {
    drawn_pts.current = [];
    setDrawPoints([]);
    clearPreview();
    setActiveTool(null);
    if (map_instance.current) map_instance.current.getContainer().style.cursor = '';
  };

  /** Removes the most recently placed vertex and redraws the preview. */
  const undoLastPoint = () => {
    drawn_pts.current.pop();
    setDrawPoints([...drawn_pts.current]);
    redrawPreview(drawn_pts.current);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDEBAR TOOL HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * handleToolClick — toggles the active sidebar tool (draw / delete).
   * Clicking the same tool again deactivates it; switching tools first cancels
   * any in-progress drawing before activating the new tool.
   */
  const handleToolClick = (tool) => {
    if (activeTool === tool) {
      // Deactivate the current tool
      cancelDrawing();
      setActiveTool(null);
      activeToolRef.current = null;
      if (map_instance.current) map_instance.current.getContainer().style.cursor = '';
    } else {
      // Switch to the new tool (cancel any ongoing drawing first)
      cancelDrawing();
      setActiveTool(tool);
      activeToolRef.current = tool;
      if (map_instance.current) {
        // Change the map cursor to give visual feedback about the active mode
        map_instance.current.getContainer().style.cursor =
          tool === 'draw'   ? 'crosshair'   :
          tool === 'delete' ? 'not-allowed' : '';
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE GEOFENCE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * handleSaveGeofence — submits the drawn polygon to the backend API.
   *
   * Coordinate conversion:
   *   The polygon was drawn in Leaflet's [lat, lng] order.
   *   GeoJSON (what the API expects) uses [lng, lat].
   *   We also close the ring by repeating the first vertex at the end,
   *   as required by the GeoJSON Polygon specification.
   *
   * Fallback:
   *   If the API call fails (e.g. no connectivity), the zone is rendered locally
   *   using a temporary 'local_*' ID and stored in localStorage only.
   *   It will not survive a page refresh without a successful API save.
   */
  const handleSaveGeofence = async () => {
    if (!saveForm.name.trim() || !saveForm.vesselId) return;
    const cfg = ZONE_CONFIG[saveForm.zoneType];

    // Convert [lat, lng] → GeoJSON [lng, lat] and close the ring
    const geoCoords = [
      ...pendingCoords.map(([la, ln]) => [ln, la]),
      [pendingCoords[0][1], pendingCoords[0][0]] // closing vertex (same as first)
    ];

    const body = {
      vessel_id:     parseInt(saveForm.vesselId),
      geofence_type: cfg.apiType,
      geometry:      { type: 'Polygon', coordinates: [geoCoords] }
    };

    setSaving(true);
    try {
      const res = await api.createGeofence(body);
      const id  = res.data?.id;
      // Persist the user-chosen name and display type in localStorage
      if (id) saveZoneMeta(id, { name: saveForm.name, zoneType: saveForm.zoneType });
      setShowSaveModal(false);
      await loadData(); // refresh to get the saved geofence back from the API
    } catch (_) {
      // API failed — render the zone locally using a temporary ID
      const localId = 'local_' + Date.now();
      saveZoneMeta(localId, { name: saveForm.name, zoneType: saveForm.zoneType });
      setShowSaveModal(false);
      renderLocalGeofence(pendingCoords, saveForm.name, saveForm.zoneType, localId);
    } finally {
      setSaving(false);
      setActiveTool(null);
      activeToolRef.current = null;
      if (map_instance.current) map_instance.current.getContainer().style.cursor = '';
    }
  };

  /**
   * renderLocalGeofence — draws a geofence polygon that was not persisted to the
   * backend (used as a fallback when the API save fails).
   * The zone is stored in geo_layers so it can still be cleared on delete.
   */
  const renderLocalGeofence = (coords, name, zoneType, id) => {
    const cfg = ZONE_CONFIG[zoneType];
    const polygon = L.polygon(coords, {
      color: cfg.color, fillColor: cfg.fillColor, fillOpacity: cfg.fillOpacity, weight: 2
    }).addTo(map_instance.current);

    const labelIcon = L.divIcon({
      className: 'geofence-label',
      html:      `<div class="gfl-inner gfl-${zoneType}">${name}</div>`,
      iconSize:  null, iconAnchor: [0, 0]
    });
    const label = L.marker(polygon.getBounds().getCenter(), {
      icon: labelIcon, interactive: false, zIndexOffset: -1000
    }).addTo(map_instance.current);

    geo_layers.current[id] = { polygon, label };
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE GEOFENCE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * handleDeleteGeofence — deletes a zone from the API, removes its layers from
   * the map, clears its localStorage metadata, and updates React state.
   *
   * The API call is wrapped in try/catch so that the zone is always removed from
   * the UI even if the backend request fails (e.g. the zone was local-only).
   */
  const handleDeleteGeofence = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.deleteGeofence(id);
    } catch (_) { /* remove from UI regardless of API outcome */ }
    removeZoneMeta(id);
    const layers = geo_layers.current[id];
    if (layers && map_instance.current) {
      map_instance.current.removeLayer(layers.polygon);
      if (layers.label) map_instance.current.removeLayer(layers.label);
      delete geo_layers.current[id];
    }
    setGeofences(prev => prev.filter(g => g.id !== id));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VESSEL TRACKBACK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * clearTrack — removes all track polyline segments and waypoint dots from the map
   * and resets the tracked-vessel state. Called before loading a new track or when
   * the user presses the X button in the VESSEL TRACK sidebar panel.
   */
  const clearTrack = () => {
    track_layers.current.forEach(l => map_instance.current?.removeLayer(l));
    track_layers.current = [];
    trackedVesselRef.current = null; // unblocks fitBounds on the next vessel list refresh
    setTrackedVessel(null);
    setTrackInfo(null);
  };

  /**
   * loadVesselTrack — fetches telemetry for a vessel and draws its historical path.
   *
   * @param vessel        The vessel object (needs .id, .name).
   * @param hoursOverride Optional override — if provided, uses this instead of
   *                      the currently selected trackRange.hours. Used by the
   *                      trackRange change effect to reload with the new period.
   *
   * Visual design of the track:
   *   • Gradient polyline — each segment gets a higher opacity and thicker weight
   *     as it approaches the most recent position (oldest = faint/thin, newest = solid/thick).
   *   • Start dot — a grey circle at the oldest position, with a tooltip timestamp.
   *   • Waypoint dots — small cyan dots placed at ~12.5% intervals along the path.
   *
   * Bearing refinement:
   *   After the full track is loaded, we recompute the vessel's travel bearing from
   *   the last two points of the full dataset. This is more accurate than the 2-point
   *   snapshot fetched during loadData and updates the arrow marker immediately.
   */
  const loadVesselTrack = async (vessel, hoursOverride) => {
    if (!map_instance.current) return;
    clearTrack();
    const hours = hoursOverride ?? trackRange.hours;
    setTrackedVessel({ id: vessel.id, name: vessel.name });
    trackedVesselRef.current = vessel; // set ref so fitBounds is blocked during tracking
    setTrackLoading(true);

    try {
      const res = await api.getTelemetryForPeriod(vessel.id, hours);
      const raw = (res.data || []);

      // Filter to the requested time window and sort oldest → newest
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      const pts = raw
        .filter(p => p.latitude && p.longitude && new Date(p.timestamp || p.created_at).getTime() >= cutoff)
        .sort((a, b) => new Date(a.timestamp || a.created_at) - new Date(b.timestamp || b.created_at));

      // Not enough data to draw a path
      if (pts.length < 2) {
        setTrackInfo({ points: pts.length, oldest: null, newest: null });
        setTrackLoading(false);
        return;
      }

      const total = pts.length;
      const map   = map_instance.current;

      // ── Gradient polyline ─────────────────────────────────────────────────
      // Draw one short line segment per consecutive pair of points.
      // t (0 → 1) represents how far along the path we are, used to interpolate
      // opacity and line weight to create the fade-in effect.
      for (let i = 1; i < total; i++) {
        const prev    = pts[i - 1];
        const curr    = pts[i];
        const t       = i / (total - 1); // normalised position along the path (0 = oldest, 1 = newest)
        const opacity = 0.18 + t * 0.82; // fades from 0.18 (nearly invisible) to 1.0 (fully opaque)
        const weight  = 1.5  + t * 2;    // grows from 1.5 px to 3.5 px

        const seg = L.polyline(
          [[parseFloat(prev.latitude), parseFloat(prev.longitude)],
           [parseFloat(curr.latitude), parseFloat(curr.longitude)]],
          { color: '#38bdf8', weight, opacity, lineCap: 'round', lineJoin: 'round' }
        ).addTo(map);
        track_layers.current.push(seg);
      }

      // ── Start dot ─────────────────────────────────────────────────────────
      // Grey circle at the oldest position in the window, with a popup timestamp.
      const first    = pts[0];
      const startDot = L.circleMarker(
        [parseFloat(first.latitude), parseFloat(first.longitude)],
        { radius: 5, color: '#fff', fillColor: '#64748b', fillOpacity: 1, weight: 2 }
      ).bindPopup(`<div style="color:#fff;font-size:.85rem;">
          <strong>Track Start</strong><br/>
          ${new Date(first.timestamp || first.created_at).toLocaleString()}
        </div>`).addTo(map);
      track_layers.current.push(startDot);

      // ── Waypoint dots ─────────────────────────────────────────────────────
      // Place ~8 intermediate dots at evenly-spaced indices along the path.
      // Each dot's fill opacity increases toward the newest position.
      const step = Math.max(1, Math.floor(total / 8));
      for (let i = step; i < total - 1; i += step) {
        const p = pts[i];
        const t = i / (total - 1);
        const dot = L.circleMarker(
          [parseFloat(p.latitude), parseFloat(p.longitude)],
          { radius: 3, color: 'rgba(56,189,248,0.6)', fillColor: '#38bdf8', fillOpacity: 0.4 + t * 0.6, weight: 1 }
        ).bindPopup(`<div style="color:#fff;font-size:.85rem;">
            ${new Date(p.timestamp || p.created_at).toLocaleString()}
          </div>`).addTo(map);
        track_layers.current.push(dot);
      }

      // ── Bearing refinement ────────────────────────────────────────────────
      // Recompute the vessel's heading from the two most recent points in the
      // full track dataset (more accurate than the 2-point snapshot in loadData).
      // This immediately rotates the vessel arrow to the correct direction.
      const prevPt        = pts[total - 2];
      const currPt        = pts[total - 1];
      const refinedBearing = computeBearing(
        +prevPt.latitude, +prevPt.longitude,
        +currPt.latitude, +currPt.longitude
      );
      setVesselBearings(prev => ({ ...prev, [vessel.id]: refinedBearing }));

      // Zoom the map to frame the entire track
      const trackGroup = L.featureGroup(track_layers.current);
      map.fitBounds(trackGroup.getBounds().pad(0.15));

      // Update the sidebar track info panel
      setTrackInfo({
        points: total,
        oldest: new Date(first.timestamp || first.created_at),
        newest: new Date(pts[total - 1].timestamp || pts[total - 1].created_at)
      });

    } catch (err) {
      console.error('Track error:', err);
      setTrackInfo({ points: 0, oldest: null, newest: null });
    } finally {
      setTrackLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER / BUILDER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * getVesselStatus — derives a UI status string from the vessel object.
   *   'alert'   — emergency alert is currently active
   *   'offline' — vessel is not at sea, has no check-in timestamp, or last
   *               check-in was more than 1 hour ago
   *   'safe'    — vessel is at sea and checked in within the last hour
   */
  const getVesselStatus = (vessel) => {
    if (vessel.emergency_alert_active) return 'alert';
    if (!vessel.at_sea_status || !vessel.last_check_in_at) return 'offline';
    if ((Date.now() - new Date(vessel.last_check_in_at)) / 3600000 > 1) return 'offline';
    return 'safe';
  };

  /**
   * createVesselIcon — builds a Leaflet divIcon for a vessel marker.
   *
   * The icon has two parts (stacked vertically, both rotated by heading degrees):
   *   1. A CSS triangle (▲) pointing upward — acts as the directional arrow.
   *   2. A glowing circle dot — the vessel position indicator.
   *
   * Active vessels (safe/alert) also get an animated pulse ring behind the dot.
   *
   * @param status   'safe' | 'alert' | 'offline'
   * @param heading  Rotation in degrees (0 = North, 90 = East, etc.)
   */
  const createVesselIcon = (status, heading = 0) => {
    const clr   = status === 'safe' ? '#4CAF50' : '#ef4444'; // green for safe, red for alert/offline
    const glow  = status === 'safe' ? 'rgba(76,175,80,0.45)' : 'rgba(239,68,68,0.4)';
    const pulse = status !== 'offline'; // pulse animation only for active vessels
    return L.divIcon({
      className: 'custom-vessel-marker',
      html: `
        <div style="position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center;">
          ${pulse ? `<div class="vessel-pulse-ring" style="position:absolute;width:38px;height:38px;border-radius:50%;background:${glow};"></div>` : ''}
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;transform:rotate(${heading}deg);">
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid ${clr};filter:drop-shadow(0 0 3px ${clr});"></div>
            <div style="width:16px;height:16px;border-radius:50%;background:${clr};border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 0 10px ${clr},0 0 20px ${glow};"></div>
          </div>
        </div>`,
      iconSize:    [46, 46],
      iconAnchor:  [23, 23], // centre of the 46×46 icon
      popupAnchor: [0, -23]  // popup appears above the marker
    });
  };

  /**
   * buildVesselPopup — returns an HTML string for the vessel click popup.
   * Includes name, IMEI, status, coordinates, and an emergency warning if active.
   */
  const buildVesselPopup = (vessel, lat, lng, status) => {
    const c = status === 'safe' ? '#4CAF50' : '#ef4444';
    return `<div style="color:#fff;min-width:180px;">
      <h3 style="margin:0 0 8px;color:${c};font-size:1rem;">${vessel.name}</h3>
      <p style="margin:3px 0;font-size:.85rem;"><strong>IMEI:</strong> ${vessel.imei}</p>
      <p style="margin:3px 0;font-size:.85rem;"><strong>Status:</strong> <span style="color:${c}">${status.toUpperCase()}</span></p>
      <p style="margin:3px 0;font-size:.85rem;"><strong>Position:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
      ${vessel.emergency_alert_active ? '<p style="margin:4px 0;color:#ef4444;font-weight:600;">EMERGENCY ALERT ACTIVE</p>' : ''}
    </div>`;
  };

  /**
   * buildGeofencePopup — returns an HTML string for the geofence click popup.
   * Shows zone name, type label, and a "ALERTS MUTED" notice if applicable.
   */
  const buildGeofencePopup = (geofence, name, zoneType, cfg, muted) =>
    `<div style="color:#fff;min-width:160px;">
      <h3 style="margin:0 0 6px;color:${cfg.color};font-size:1rem;">${name}</h3>
      <p style="margin:3px 0;font-size:.85rem;"><strong>Type:</strong> ${cfg.label}</p>
      ${muted ? '<p style="margin:4px 0;color:#888;font-size:.85rem;">ALERTS MUTED</p>' : ''}
    </div>`;

  // Count of vessels currently considered active (safe or alert, not offline)
  const activeCount = vessels.filter(v => getVesselStatus(v) !== 'offline').length;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="content_container geofences_page">

      {/* ── Page header ── */}
      <div className="geo_header">
        <h1>Fleet Map &amp; Geofences</h1>
        <div className="geo_header_chips">
          {/* Show a loading spinner during the initial data fetch */}
          {loading ? (
            <span className="geo_chip neutral"><span className="geo_spinner"></span>Loading...</span>
          ) : (
            <>
              {/* Active vessel count chip */}
              <span className="geo_chip safe"><IconShip />{activeCount} / {vessels.length} Active</span>
              {/* Geofence zone count chip */}
              <span className="geo_chip neutral">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="3,12 12,3 21,12 12,21"/></svg>
                {geofences.length} Zones
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Main layout: sidebar + map ── */}
      <div className="geo_layout">

        {/* ════════════════════════════════
            SIDEBAR
            ════════════════════════════════ */}
        <aside className="geo_sidebar">

          {/* ── Fit to fleet button ────────────────────────────────────── */}
          <div className="sb_section" style={{ paddingBottom: '10px' }}>
            <button
              className="sb_tool_btn"
              onClick={() => {
                if (!map_instance.current || !vessel_markers.current.length) return;
                const group = L.featureGroup(vessel_markers.current);
                map_instance.current.fitBounds(group.getBounds().pad(0.15));
              }}
              disabled={!vessel_markers.current.length}
              title="Zoom map to show all vessels"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
              Fit to Fleet
            </button>
          </div>

          {/* ── Track Period selector ──────────────────────────────────────
              Always visible. Lets the user choose how far back the vessel
              trackback path should go. Changing this automatically reloads
              the track for any currently-tracked vessel. */}
          <div className="sb_section sb_period_section">
            <span className="sb_label">TRACK PERIOD</span>
            <div className="period_presets">
              {/* Preset quick-select buttons (24 H, 3 D, 7 D, 30 D) */}
              {TRACK_PRESETS.map(p => (
                <button
                  key={p.preset}
                  className={`period_btn${trackRange.preset === p.preset && !customActive ? ' active' : ''}`}
                  onClick={() => { setCustomActive(false); setTrackRange(p); }}
                >
                  {p.label}
                </button>
              ))}
              {/* Custom button — reveals a days input below */}
              <button
                className={`period_btn${customActive ? ' active' : ''}`}
                onClick={() => setCustomActive(true)}
              >
                Custom
              </button>
            </div>

            {/* Custom days input — shown only when Custom is active */}
            {customActive && (
              <div className="custom_period_row">
                <input
                  type="number"
                  className="custom_period_input"
                  min="1"
                  max="365"
                  placeholder="e.g. 14"
                  value={customDays}
                  onChange={e => setCustomDays(e.target.value)}
                  onKeyDown={e => {
                    // Allow pressing Enter to apply without clicking the button
                    if (e.key === 'Enter' && customDays > 0) {
                      const h = Math.round(parseFloat(customDays) * 24);
                      setTrackRange({ hours: h, label: `${customDays}D`, preset: 'custom' });
                    }
                  }}
                />
                <span className="custom_period_unit">days</span>
                <button
                  className="custom_period_apply"
                  disabled={!customDays || parseFloat(customDays) <= 0}
                  onClick={() => {
                    const h = Math.round(parseFloat(customDays) * 24);
                    setTrackRange({ hours: h, label: `${customDays}D`, preset: 'custom' });
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Status hint below the presets */}
            <p className="period_hint">
              {trackRange.preset === 'custom'
                ? `Showing last ${trackRange.label}`
                : `Default: last ${trackRange.label}`}
              {trackedVessel ? ` · ${trackedVessel.name}` : ' · Click a vessel'}
            </p>
          </div>

          {/* ── Vessel Track info panel ────────────────────────────────────
              Only rendered when a vessel has been clicked (or is loading).
              Shows the vessel name, time range, point count, and a gradient
              bar illustrating the fade from oldest to newest position. */}
          {(trackedVessel || trackLoading) && (
            <div className="sb_section sb_track_section">
              <div className="sb_track_head">
                <span className="sb_label">VESSEL TRACK</span>
                {/* X button clears the track and returns to fleet view */}
                <button className="sb_track_clear" onClick={clearTrack} title="Clear track">
                  <IconX />
                </button>
              </div>

              {trackLoading ? (
                <div className="sb_track_loading">
                  <span className="geo_spinner"></span>
                  <span>Loading {trackRange.label} track...</span>
                </div>
              ) : (
                <>
                  <p className="sb_track_name">{trackedVessel?.name}</p>
                  <p className="sb_track_range_badge">{trackRange.label}</p>
                  {trackInfo && trackInfo.points >= 2 ? (
                    <div className="sb_track_meta">
                      <div className="sb_track_row">
                        <span className="stm_label">Points</span>
                        <span className="stm_val">{trackInfo.points}</span>
                      </div>
                      <div className="sb_track_row">
                        <span className="stm_label">From</span>
                        <span className="stm_val">
                          {trackInfo.oldest?.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          {' '}{trackInfo.oldest?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="sb_track_row">
                        <span className="stm_label">To</span>
                        <span className="stm_val">
                          {trackInfo.newest?.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          {' '}{trackInfo.newest?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {/* Visual gradient bar: dark (oldest) → cyan (newest) */}
                      <div className="sb_track_bar">
                        <span className="stb_old">Oldest</span>
                        <div className="stb_gradient"></div>
                        <span className="stb_new">Now</span>
                      </div>
                    </div>
                  ) : (
                    <p className="sb_track_none">No position data in this period</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Drawing Tools ──────────────────────────────────────────────
              The Draw Zone button activates polygon drawing mode.
              While active, the zone type picker and drawing status are shown. */}
          <div className="sb_section">
            <span className="sb_label">DRAWING TOOLS</span>

            <button
              className={`sb_tool_btn${activeTool === 'draw' ? ' active' : ''}`}
              onClick={() => handleToolClick('draw')}
            >
              <IconDraw />
              {activeTool === 'draw' ? 'Drawing Mode ON' : 'Draw Zone'}
            </button>

            {/* Zone type selector — only visible while drawing mode is active */}
            {activeTool === 'draw' && (
              <div className="zone_picker">
                {Object.entries(ZONE_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    className={`zone_pick_btn${drawZoneType === key ? ' active' : ''}`}
                    onClick={() => {
                      setDrawZoneType(key);
                      drawZoneRef.current = key; // sync ref so preview uses correct colour immediately
                      redrawPreview(drawn_pts.current);
                    }}
                  >
                    <span className="zpb_dot" style={{ background: cfg.color }}></span>
                    {cfg.label}
                  </button>
                ))}
              </div>
            )}

            {/* Drawing progress hint + action buttons (Undo / Finish / Cancel) */}
            {activeTool === 'draw' && (
              <div className="draw_status_box">
                <p className="draw_hint">
                  {drawPoints.length === 0
                    ? 'Click on the map to place points'
                    : drawPoints.length < 3
                      ? `${drawPoints.length} point${drawPoints.length > 1 ? 's' : ''} — need ${3 - drawPoints.length} more`
                      : `${drawPoints.length} points — double-click or press Finish`}
                </p>
                <div className="draw_btns">
                  {drawPoints.length > 0 && (
                    <button className="db_btn undo" onClick={undoLastPoint}><IconUndo />Undo</button>
                  )}
                  {drawPoints.length >= 3 && (
                    <button className="db_btn finish" onClick={finishDrawing}><IconCheck />Finish</button>
                  )}
                  <button className="db_btn cancel" onClick={cancelDrawing}><IconX />Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Manage section (admin only) ────────────────────────────────
              Delete Zone mode: clicking any polygon on the map will prompt
              the user to confirm deletion. */}
          {isAdmin && (
            <div className="sb_section">
              <span className="sb_label">MANAGE</span>
              <button
                className={`sb_tool_btn danger${activeTool === 'delete' ? ' active' : ''}`}
                onClick={() => handleToolClick('delete')}
              >
                <IconTrash />
                {activeTool === 'delete' ? 'Click a zone to delete' : 'Delete Zone'}
              </button>
            </div>
          )}

          {/* ── Map Layers accordion ───────────────────────────────────────
              Collapsed by default to save sidebar space.
              When collapsed, the active layer name is shown as a small badge.
              Expanding reveals the three base layer buttons and the
              nautical symbols (OpenSeaMap) toggle. */}
          <div className="sb_section">
            <button className="sb_label_toggle" onClick={() => setLayersOpen(v => !v)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="sb_label">MAP LAYERS</span>
                {/* Show active layer name when collapsed */}
                {!layersOpen && (
                  <span className="sb_layer_hint">{TILE_LAYERS[activeBaseLayer].label}</span>
                )}
              </div>
              {/* Chevron rotates 180° when open */}
              <svg
                className={`sb_chevron${layersOpen ? ' open' : ''}`}
                width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Collapsible content — CSS grid-template-rows transition for smooth animation */}
            <div className={`sb_collapsible${layersOpen ? ' open' : ''}`}>
              <div className="sb_collapsible_inner">
                {/* Base layer selection buttons */}
                <div className="layer_btns">
                  {Object.entries(TILE_LAYERS).map(([key, cfg]) => (
                    <button
                      key={key}
                      className={`layer_btn${activeBaseLayer === key ? ' active' : ''}`}
                      onClick={() => setActiveBaseLayer(key)}
                    >
                      {key === 'ocean'     && <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18c2 0 3-1 5-1s3 1 5 1 3-1 5-1v2c-2 0-3 1-5 1s-3-1-5-1-3 1-5 1v-2zm0-4c2 0 3-1 5-1s3 1 5 1 3-1 5-1v2c-2 0-3 1-5 1s-3-1-5-1-3 1-5 1v-2zm0-4c2 0 3-1 5-1s3 1 5 1 3-1 5-1v2c-2 0-3 1-5 1s-3-1-5-1-3 1-5 1v-2z"/></svg>}
                      {key === 'street'    && <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>}
                      {key === 'satellite' && <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 0 0 0 18A9 9 0 0 0 12 3zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-11a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>}
                      {cfg.label}
                    </button>
                  ))}
                </div>

                {/* OpenSeaMap seamark symbols toggle */}
                <label className="toggle_row">
                  <span className="toggle_label">Nautical symbols</span>
                  <button
                    className={`toggle_pill${showSeamarks ? ' on' : ''}`}
                    onClick={() => setShowSeamarks(v => !v)}
                  >
                    <span className="toggle_thumb"></span>
                  </button>
                </label>
              </div>
            </div>
          </div>

          {/* ── Legend ─────────────────────────────────────────────────────
              Quick visual reference for zone colours and vessel status colours. */}
          <div className="sb_section">
            <span className="sb_label">LEGEND</span>
            <div className="sb_legend">
              {/* Zone type swatches — generated from ZONE_CONFIG */}
              {Object.entries(ZONE_CONFIG).map(([key, cfg]) => (
                <div key={key} className="leg_row">
                  <span className="leg_swatch" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}55` }}></span>
                  <span className="leg_text">{cfg.label}</span>
                </div>
              ))}
              <div className="leg_divider"></div>
              {/* Vessel status swatches */}
              <div className="leg_row">
                <span className="leg_swatch" style={{ background: '#4CAF50', boxShadow: '0 0 6px rgba(76,175,80,0.4)' }}></span>
                <span className="leg_text">Active Vessel</span>
              </div>
              <div className="leg_row">
                <span className="leg_swatch" style={{ background: '#ef4444' }}></span>
                <span className="leg_text">Inactive / Alert</span>
              </div>
            </div>
          </div>

          {/* ── Saved Zones list ────────────────────────────────────────────
              Lists all geofences fetched from the API with their colour dot,
              name, type, and a delete button for admin users. */}
          <div className="sb_section sb_zones_section">
            <span className="sb_label">SAVED ZONES ({geofences.length})</span>
            <div className="sb_zones_list">
              {geofences.length === 0 ? (
                <p className="sb_empty">No zones saved yet.<br />Use Draw Zone to create one.</p>
              ) : (
                geofences.map(g => {
                  const meta = getZoneMeta(g.id);
                  const zt   = meta?.zoneType || getZoneTypeFromApiType(g.geofence_type);
                  const name = meta?.name     || `Zone ${g.id}`;
                  const cfg  = ZONE_CONFIG[zt];
                  return (
                    <div key={g.id} className="sz_item">
                      <span className="sz_dot" style={{ background: cfg.color }}></span>
                      <div className="sz_info">
                        <p className="sz_name">{name}</p>
                        <p className="sz_type">{cfg.label}{g.is_muted ? ' · Muted' : ''}</p>
                      </div>
                      {isAdmin && (
                        <button className="sz_del" onClick={() => handleDeleteGeofence(g.id, name)} title="Delete">
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </aside>{/* end sidebar */}

        {/* ════════════════════════════════
            MAP AREA
            ════════════════════════════════ */}
        <div className="geo_map_wrap">
          {/* The empty div below is where Leaflet mounts the actual map canvas */}
          <div id="geofence_map" ref={reference_map}></div>

          {/* Context hint bar — shown at the bottom of the map based on active mode */}
          {activeTool === 'draw' && (
            <div className="map_hint_bar">
              {drawPoints.length >= 3
                ? `${drawPoints.length} points placed — double-click on map or press Finish to close`
                : 'Click on the map to place polygon vertices'}
            </div>
          )}
          {activeTool === 'delete' && (
            <div className="map_hint_bar danger">Click on any zone on the map to delete it</div>
          )}
          {!activeTool && !trackedVessel && !trackLoading && (
            <div className="map_hint_bar subtle">Click a vessel to view its {trackRange.label} track</div>
          )}
        </div>

      </div>{/* end geo_layout */}

      {/* ════════════════════════════════
          SAVE ZONE MODAL
          ════════════════════════════════
          Opens after the user finishes drawing a polygon.
          Collects: zone name, zone type (safe/dangerous/restricted), vessel to assign to.
          On save, POSTs to /api/geofences and stores name+type in localStorage. */}
      {showSaveModal && (
        <div className="modal_overlay" onClick={() => !saving && setShowSaveModal(false)}>
          {/* stopPropagation prevents the overlay click-to-close from firing when the modal itself is clicked */}
          <div className="geo_modal" onClick={e => e.stopPropagation()}>
            <div className="geo_modal_head">
              <h2>Save Zone</h2>
              <button className="geo_modal_close" onClick={() => !saving && setShowSaveModal(false)}>
                <IconX />
              </button>
            </div>

            <div className="geo_modal_body">
              {/* Zone name input */}
              <div className="gm_field">
                <label>Zone Name</label>
                <input
                  type="text"
                  value={saveForm.name}
                  onChange={e => setSaveForm({ ...saveForm, name: e.target.value })}
                  placeholder="e.g. Plymouth Harbour, North Sea Exclusion..."
                  autoFocus
                />
              </div>

              {/* Zone type card grid — visual picker for safe / dangerous / restricted */}
              <div className="gm_field">
                <label>Zone Type</label>
                <div className="zone_card_grid">
                  {Object.entries(ZONE_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      className={`zone_card${saveForm.zoneType === key ? ' active' : ''}`}
                      style={{ '--zc': cfg.color }} // CSS variable used for the active border glow
                      onClick={() => setSaveForm({ ...saveForm, zoneType: key })}
                    >
                      <span className="zc_dot" style={{ background: cfg.color, boxShadow: `0 0 10px ${cfg.color}` }}></span>
                      <span className="zc_label">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vessel assignment dropdown — required field */}
              <div className="gm_field">
                <label>Assign to Vessel <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  value={saveForm.vesselId}
                  onChange={e => setSaveForm({ ...saveForm, vesselId: e.target.value })}
                >
                  <option value="">Select a vessel...</option>
                  {vessels.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Summary line below the form */}
              <p className="gm_meta">
                {pendingCoords.length} vertices &nbsp;·&nbsp; {ZONE_CONFIG[saveForm.zoneType]?.label}
              </p>
            </div>

            <div className="geo_modal_foot">
              <button className="gm_btn secondary" onClick={() => setShowSaveModal(false)} disabled={saving}>
                Cancel
              </button>
              {/* Save button is disabled until both name and vessel are provided */}
              <button
                className="gm_btn primary"
                style={{ '--btn-clr': ZONE_CONFIG[saveForm.zoneType]?.color }} // drives the button accent colour
                onClick={handleSaveGeofence}
                disabled={saving || !saveForm.name.trim() || !saveForm.vesselId}
              >
                {saving ? <><span className="inline_spinner"></span>Saving...</> : 'Save Zone'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Geofences;
