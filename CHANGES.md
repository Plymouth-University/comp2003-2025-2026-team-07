# UI & Feature Changes — 24 March 2026

## Overview

This document summarises all frontend changes made in this session to the OSHEN maritime vessel tracking application.

---

## 1. Vessel Direction Arrow — Bearing Calculation (`Geofences.jsx`)

**Problem:** The directional arrow on vessel map markers had no reliable way to determine which way the vessel was actually moving. The `course`/`heading` fields in telemetry JSON are optional and often absent.

**Solution:** Added a mathematical bearing calculation using the forward azimuth formula derived from the last two GPS positions in telemetry history.

### New function — `computeBearing`
```js
function computeBearing(lat1, lng1, lat2, lng2) { ... }
```
- Uses spherical trigonometry (`atan2`) to compute the 0–360° direction of travel between two coordinates.
- Returns `null` if both points are identical (vessel stationary).

### Changes to `loadData`
- After fetching vessels, fires `api.getTelemetryHistory(vesselId, 2)` for every vessel **in parallel** using `Promise.allSettled`.
- Populates `vesselBearings` state: `{ [vesselId]: degrees }`.

### Changes to `loadVesselTrack`
- When a full vessel track is loaded, **re-computes** the bearing from the last two points of the full track dataset (more accurate than the 2-point snapshot).

### Heading priority chain on marker render
```
vesselBearings[vessel.id]  →  pos.course  →  pos.heading  →  0°
```

### fitBounds guard
- Added `!trackedVesselRef.current` guard so the map does not jump away from an open track view during the 30-second auto-refresh polling cycle.

---

## 2. Map Layers — Collapsible Accordion (`Geofences.jsx` + `Geofences.css`)

**Problem:** The Map Layers section in the sidebar took up permanent vertical space even when not in use.

**Solution:** Converted the Map Layers section into a smooth accordion using CSS grid height transitions.

### CSS technique
```css
.sb_collapsible { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.25s ease; }
.sb_collapsible.open { grid-template-rows: 1fr; }
.sb_collapsible_inner { overflow: hidden; }
```

### Features
- Toggle button with a rotating chevron SVG (▾).
- When collapsed, shows the currently active layer name as a small pill badge (`.sb_layer_hint`) next to the section title.
- State managed by `layersOpen` (`useState(true)` — open by default).

---

## 3. Emoji → SVG Icon Replacements

All emoji characters were replaced with inline SVG icons across every file for a consistent, professional appearance.

| File | Replaced |
|---|---|
| `Cstar.jsx` | `⚠️` warning, `🗑️` delete, `➕` add, `📋` copy — all → SVG |
| `UserSupport.jsx` | `⚠️` access-denied warning → SVG |
| `login.jsx` | `⚠️` error message → SVG |
| `index.js` | `🔄` loading spinner → CSS `spin` animation div |

---

## 4. Empty State Components

Added proper empty-state UI (icon + headline + description) to replace bare "no data" text strings.

| Location | Empty state for |
|---|---|
| `Cstar.jsx` | No vessels found |
| `Cstar.jsx` | No alert rules configured |
| `UserSupport.jsx` | No users found |

All use the shared `.empty_state` / `.empty_state_icon` CSS classes.

---

## 5. Accent Colour Unification

Replaced all legacy blue values with the single design-system blue `#2196F3`.

| Old value | New value | Files affected |
|---|---|---|
| `#007bff` | `#2196F3` | `Forms.css`, `UserSupport.css`, `login.css` |
| `#0056b3` | `#1976D2` | `Forms.css`, `login.css` |
| `#2a5298` | `#2196F3` | `MainDashboard.css` |
| `#1e3c72` | `#2196F3` | `MainDashboard.css` |

---

## 6. Settings Sidebar Redesign (`Settings.css`)

- Navigation buttons changed from solid fill active state to a **left-border underline** pattern:
  ```css
  .settings_nav_btn         { border-left: 3px solid transparent; }
  .settings_nav_btn.active  { border-left-color: #2196F3; background: rgba(33,150,243,0.1); }
  ```
- Section label typography: `0.7rem`, `font-weight: 700`, `letter-spacing: 0.12em`, uppercase — cleaner visual hierarchy.
- Content panel: subtle background + border instead of plain white.

---

## 7. C-STAR Page Improvements (`Cstar.jsx` + `Cstar.css`)

- **"Active Vessels" badge** — replaced plain text count with an animated green dot + count pill (`.fleet_count_badge` / `.fcb_dot`).
- **Modal close button** — replaced unstyled `×` character with a proper icon button (`.modal_close_btn`).
- **Modal body scroll** — replaced inline style with `.modal_body` class (includes thin scrollbar).
- **Monospace values** — alert rule values use `ui-monospace, 'JetBrains Mono', 'Fira Code'` font stack via `.detail_value`.

---

## 8. Global Typography (`MainDashboard.css`)

```css
h1 { font-weight: 600; font-size: 1.5rem; letter-spacing: -0.01em; }
```
Reduces the page-title size slightly for a less heavy feel across all dashboard pages.

---

## 9. Login Page (`login.css`)

- Input focus ring: `border-color: #2196F3` + `box-shadow: 0 0 0 3px rgba(33,150,243,0.12)`.
- Button hover: glow `box-shadow: 0 6px 18px rgba(33,150,243,0.38)`.

---

## 10. Loading Spinner (`index.js` + `index.css`)

- Replaced emoji with a CSS-animated circle div.
- Added `@keyframes spin { to { transform: rotate(360deg); } }` to `index.css` so it is globally available.

---

## 11. Code Documentation (`Geofences.jsx`)

The entire `Geofences.jsx` file was rewritten with comprehensive comments for team readability before pushing to GitHub:

- **File-level JSDoc header** — describes the three core features and lists libraries/APIs used.
- **Section separators** (`// ═══`) for: Effects, Polygon Drawing, Sidebar Tool Handlers, Save Geofence, Delete Geofence, Vessel Trackback, Helper Functions, Render.
- **Function-level JSDoc** on every function — parameters, return values, side effects.
- **Inline comments** explaining:
  - The ref-mirror pattern (why refs duplicate state for Leaflet event closures)
  - GeoJSON coordinate swap (`[lng, lat]` → `[lat, lng]`)
  - Bearing priority chain
  - fitBounds guard logic
  - Gradient polyline math
  - localStorage fallback for zone metadata
- **JSX section comments** on every major UI block in the render tree.

---

## Files Modified

| File | Changes |
|---|---|
| `SourceCode/src/Geofences.jsx` | Bearing calc, collapsible layers, full comments |
| `SourceCode/src/Geofences.css` | Accordion + chevron + layer hint styles |
| `SourceCode/src/Cstar.jsx` | SVG icons, empty states, badge, modal fixes |
| `SourceCode/src/Cstar.css` | New utility classes |
| `SourceCode/src/UserSupport.jsx` | SVG icon, empty state |
| `SourceCode/src/UserSupport.css` | Empty state styles, accent colour |
| `SourceCode/src/MainDashboard.css` | Typography, accent colour, nav active state |
| `SourceCode/src/Forms.css` | Accent colour unification |
| `SourceCode/src/Settings.css` | Sidebar redesign |
| `SourceCode/src/services/login.jsx` | SVG error icon |
| `SourceCode/src/services/login.css` | Focus ring, button glow |
| `SourceCode/src/index.js` | CSS spinner replacing emoji |
| `SourceCode/src/index.css` | `@keyframes spin` |
