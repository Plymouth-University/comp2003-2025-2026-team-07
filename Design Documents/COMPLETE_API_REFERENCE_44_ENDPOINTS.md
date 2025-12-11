# 📡 Complete API Reference - All 44 Endpoints

**Oshen Alert System - Comprehensive Backend API Documentation**  
**Backend Developer:** Alvin (Backend Dev 1)  
**Last Updated:** December 1, 2024  
**API Version:** 1.0.0  
**Status:** ✅ Production Ready

---

## 🌐 **Base URL**

```
Production: https://ares-swirlier-yulanda.ngrok-free.dev/api
Local:      http://localhost:3000/api
```

**⚠️ Important:** ngrok URL changes when tunnel restarts. Check team chat for current URL.

---

## 🔑 **Authentication**

**Test Credentials:**
```
Username: admin
Password: emperorpinguoshen
```

**JWT Token Usage:**
```javascript
// Include in headers for all authenticated endpoints:
Authorization: Bearer YOUR_JWT_TOKEN
```

**Token Expiration:** 24 hours

---

## 📋 **Complete Endpoint List (44 Total)**

---

### **🏥 1. HEALTH & SYSTEM (2 endpoints)**

#### **1.1 Health Check**
```http
GET /health
```
**Purpose:** Check if server is running and responsive  
**Auth Required:** ❌ No  
**Use Case:** Load balancer health checks, monitoring uptime  

**Response:**
```json
{
  "status": "OK",
  "message": "Oshen Alert System API is running",
  "timestamp": "2024-12-01T19:00:00.000Z",
  "environment": "development",
  "dataFetcher": {
    "enabled": false,
    "interval": 5
  }
}
```

**Example:**
```javascript
fetch('https://ares-swirlier-yulanda.ngrok-free.dev/health')
  .then(r => r.json())
  .then(d => console.log('Server status:', d.status));
```

---

#### **1.2 API Documentation Index**
```http
GET /api
```
**Purpose:** Get API information and available endpoints overview  
**Auth Required:** ❌ No  
**Use Case:** API discovery, checking version, seeing available routes  

**Response:**
```json
{
  "message": "Oshen Alert System API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "auth": "/api/auth",
    "vessels": "/api/vessels",
    "geofences": "/api/geofences",
    "alerts": "/api/alerts",
    "telemetry": "/api/telemetry"
  }
}
```

---

### **🔐 2. AUTHENTICATION & USERS (6 endpoints)**

#### **2.1 Login**
```http
POST /api/auth/login
```
**Purpose:** Authenticate user and receive JWT token for subsequent requests  
**Auth Required:** ❌ No  
**Use Case:** User login, get access token  

**Request Body:**
```json
{
  "username": "admin",
  "password": "emperorpinguoshen"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "email": "admin@oshen.com"
    }
  }
}
```

**Example:**
```javascript
const response = await fetch('https://ares-swirlier-yulanda.ngrok-free.dev/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'emperorpinguoshen' })
});
const { data } = await response.json();
localStorage.setItem('token', data.token);
```

---

#### **2.2 Register New User**
```http
POST /api/auth/register
```
**Purpose:** Create new user account (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Add new supervisors, operators, or admins to system  

**Request Body:**
```json
{
  "username": "supervisor1",
  "password": "securePassword123",
  "email": "supervisor1@oshen.com",
  "role": "supervisor",
  "pager_id": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "supervisor1",
    "email": "supervisor1@oshen.com",
    "role": "supervisor",
    "pager_id": "1234567890",
    "created_at": "2024-12-01T19:00:00Z"
  }
}
```

---

#### **2.3 Get Current User Info**
```http
GET /api/auth/me
```
**Purpose:** Get information about currently logged-in user  
**Auth Required:** ✅ Yes  
**Use Case:** Display user profile, check role, show user settings  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@oshen.com",
    "role": "admin",
    "pager_id": null,
    "created_at": "2024-11-27T10:00:00Z"
  }
}
```

---

#### **2.4 Change Password**
```http
PUT /api/auth/password
```
**Purpose:** Change current user's password  
**Auth Required:** ✅ Yes  
**Use Case:** User updates their own password for security  

**Request Body:**
```json
{
  "currentPassword": "emperorpinguoshen",
  "newPassword": "newSecurePassword456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

#### **2.5 List All Users**
```http
GET /api/auth/users
```
**Purpose:** Get list of all system users (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** User management dashboard, see all accounts  

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@oshen.com",
      "role": "admin",
      "pager_id": null,
      "created_at": "2024-11-27T10:00:00Z"
    },
    {
      "id": 2,
      "username": "supervisor1",
      "email": "supervisor1@oshen.com",
      "role": "supervisor",
      "pager_id": "1234567890",
      "created_at": "2024-12-01T19:00:00Z"
    }
  ],
  "count": 2
}
```

---

#### **2.6 Delete User**
```http
DELETE /api/auth/users/:id
```
**Purpose:** Delete user account (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Remove inactive users, delete test accounts  

**Example:** `DELETE /api/auth/users/2`

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### **🚢 3. VESSELS (6 endpoints)**

#### **3.1 Get All Vessels**
```http
GET /api/vessels
```
**Purpose:** Get all vessels with their latest GPS positions and status  
**Auth Required:** ✅ Yes  
**Use Case:** Dashboard vessel list, fleet overview, map markers  

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 7,
      "name": "PB1 - MicroTransat",
      "imei": "301434061997390",
      "at_sea_status": true,
      "emergency_alert_active": false,
      "escalation_threshold": 3,
      "repeat_interval_mins": 5,
      "last_check_in_at": "2024-12-01T18:55:00Z",
      "primary_supervisor_id": 1,
      "secondary_supervisor_id": null,
      "latest_position": {
        "latitude": 29.96612,
        "longitude": -20.07585,
        "timestamp": "2024-12-01T18:55:00Z"
      },
      "created_at": "2024-11-28T10:00:00Z",
      "updated_at": "2024-12-01T18:55:00Z"
    }
    // ... 6 more vessels
  ],
  "count": 7
}
```

**Example:**
```javascript
const response = await fetch('https://ares-swirlier-yulanda.ngrok-free.dev/api/vessels', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data, count } = await response.json();
console.log(`Found ${count} vessels`);
```

---

#### **3.2 Get Single Vessel**
```http
GET /api/vessels/:id
```
**Purpose:** Get detailed information about specific vessel  
**Auth Required:** ✅ Yes  
**Use Case:** Vessel detail page, editing vessel, checking specific vessel status  

**Example:** `GET /api/vessels/7`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 7,
    "name": "PB1 - MicroTransat",
    "imei": "301434061997390",
    "at_sea_status": true,
    "emergency_alert_active": false,
    "escalation_threshold": 3,
    "repeat_interval_mins": 5,
    "last_check_in_at": "2024-12-01T18:55:00Z",
    "primary_supervisor_id": 1,
    "secondary_supervisor_id": null,
    "primary_supervisor": {
      "id": 1,
      "username": "admin",
      "pager_id": null
    },
    "secondary_supervisor": null,
    "latest_position": {
      "latitude": 29.96612,
      "longitude": -20.07585,
      "timestamp": "2024-12-01T18:55:00Z"
    }
  }
}
```

---

#### **3.3 Get Vessel Statistics**
```http
GET /api/vessels/:id/stats
```
**Purpose:** Get statistics for vessel (alert counts, telemetry count, etc.)  
**Auth Required:** ✅ Yes  
**Use Case:** Vessel detail page metrics, fleet statistics dashboard  

**Example:** `GET /api/vessels/7/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "vesselId": 7,
    "vesselName": "PB1 - MicroTransat",
    "alertCounts": {
      "total": 0,
      "active": 0,
      "acknowledged": 0,
      "resolved": 0
    },
    "telemetryCount": 145,
    "lastTelemetry": {
      "latitude": 29.96612,
      "longitude": -20.07585,
      "timestamp": "2024-12-01T18:55:00Z"
    }
  }
}
```

---

#### **3.4 Create Vessel**
```http
POST /api/vessels
```
**Purpose:** Add new vessel to system (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Onboard new C-Star vessel, add test vessel  

**Request Body:**
```json
{
  "name": "PC15",
  "imei": "301434062000000",
  "at_sea_status": false,
  "escalation_threshold": 3,
  "repeat_interval_mins": 5,
  "primary_supervisor_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 8,
    "name": "PC15",
    "imei": "301434062000000",
    "at_sea_status": false,
    "emergency_alert_active": false,
    "escalation_threshold": 3,
    "repeat_interval_mins": 5,
    "primary_supervisor_id": 1,
    "secondary_supervisor_id": null,
    "created_at": "2024-12-01T19:00:00Z"
  }
}
```

---

#### **3.5 Update Vessel**
```http
PUT /api/vessels/:id
```
**Purpose:** Update vessel information (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Update vessel name, change supervisor, update settings  

**Example:** `PUT /api/vessels/8`

**Request Body:**
```json
{
  "name": "PC15 - Updated",
  "at_sea_status": true,
  "primary_supervisor_id": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 8,
    "name": "PC15 - Updated",
    "at_sea_status": true,
    "primary_supervisor_id": 2,
    "updated_at": "2024-12-01T19:05:00Z"
  }
}
```

---

#### **3.6 Delete Vessel**
```http
DELETE /api/vessels/:id
```
**Purpose:** Remove vessel from system (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Decommission vessel, remove test data  

**Example:** `DELETE /api/vessels/8`

**Response:**
```json
{
  "success": true,
  "message": "Vessel deleted successfully"
}
```

---

### **📍 4. GEOFENCES (8 endpoints)**

#### **4.1 Get All Geofences**
```http
GET /api/geofences
```
**Purpose:** Get all geofences for map display  
**Auth Required:** ✅ Yes  
**Use Case:** Display all geofences on map, geofence management list  

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "vessel_id": 1,
      "geofence_type": "keep_in",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-4.1434, 50.3634],
            [-4.1434, 50.3734],
            [-4.1334, 50.3734],
            [-4.1334, 50.3634],
            [-4.1434, 50.3634]
          ]
        ]
      },
      "is_muted": false,
      "unmute_date": null,
      "created_at": "2024-11-27T10:00:00Z",
      "updated_at": "2024-11-27T10:00:00Z",
      "vessel": {
        "id": 1,
        "name": "PC14"
      }
    }
    // ... 7 more geofences
  ],
  "count": 8
}
```

**Example:**
```javascript
const response = await fetch('https://ares-swirlier-yulanda.ngrok-free.dev/api/geofences', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
// Draw geofences on map
data.forEach(geofence => {
  drawGeofence(geofence.geometry, geofence.geofence_type);
});
```

---

#### **4.2 Get Single Geofence**
```http
GET /api/geofences/:id
```
**Purpose:** Get detailed information about specific geofence  
**Auth Required:** ✅ Yes  
**Use Case:** Edit geofence, view geofence details, check configuration  

**Example:** `GET /api/geofences/1`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "vessel_id": 1,
    "geofence_type": "keep_in",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[...]]
    },
    "is_muted": false,
    "unmute_date": null,
    "vessel": {
      "id": 1,
      "name": "PC14",
      "imei": "867530901234567"
    }
  }
}
```

---

#### **4.3 Get Geofences by Vessel**
```http
GET /api/geofences/vessel/:vesselId
```
**Purpose:** Get all geofences assigned to specific vessel  
**Auth Required:** ✅ Yes  
**Use Case:** Vessel detail page showing its geofences, filter map by vessel  

**Example:** `GET /api/geofences/vessel/1`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "vessel_id": 1,
      "geofence_type": "keep_in",
      "geometry": {...}
    },
    {
      "id": 2,
      "vessel_id": 1,
      "geofence_type": "keep_out_zone",
      "geometry": {...}
    }
  ],
  "count": 2
}
```

---

#### **4.4 Create Geofence**
```http
POST /api/geofences
```
**Purpose:** Create new geofence for vessel (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Draw new keep-in/keep-out zone, add exclusion point  

**Request Body (Polygon):**
```json
{
  "vessel_id": 1,
  "geofence_type": "keep_in",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [-4.2000, 50.4000],
        [-4.2000, 50.5000],
        [-4.1000, 50.5000],
        [-4.1000, 50.4000],
        [-4.2000, 50.4000]
      ]
    ]
  }
}
```

**Request Body (Point):**
```json
{
  "vessel_id": 1,
  "geofence_type": "keep_out_point",
  "geometry": {
    "type": "Point",
    "coordinates": [-4.1500, 50.4500]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 9,
    "vessel_id": 1,
    "geofence_type": "keep_in",
    "geometry": {...},
    "is_muted": false,
    "created_at": "2024-12-01T19:00:00Z"
  }
}
```

---

#### **4.5 Update Geofence**
```http
PUT /api/geofences/:id
```
**Purpose:** Update geofence coordinates or type (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Edit geofence boundaries, change type, update configuration  

**Example:** `PUT /api/geofences/9`

**Request Body:**
```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [-4.2500, 50.4500],
        [-4.2500, 50.5500],
        [-4.1500, 50.5500],
        [-4.1500, 50.4500],
        [-4.2500, 50.4500]
      ]
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 9,
    "geometry": {...},
    "updated_at": "2024-12-01T19:10:00Z"
  }
}
```

---

#### **4.6 Delete Geofence**
```http
DELETE /api/geofences/:id
```
**Purpose:** Remove geofence from system (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Remove obsolete geofence, delete test data  

**Example:** `DELETE /api/geofences/9`

**Response:**
```json
{
  "success": true,
  "message": "Geofence deleted successfully"
}
```

---

#### **4.7 Mute/Unmute Geofence**
```http
PATCH /api/geofences/:id/mute
```
**Purpose:** Temporarily disable geofence alerts (Supervisor+)  
**Auth Required:** ✅ Yes (Supervisor or Admin role)  
**Use Case:** Silence geofence during planned deviation, maintenance period  

**Example:** `PATCH /api/geofences/1/mute`

**Request Body (Mute indefinitely):**
```json
{
  "is_muted": true
}
```

**Request Body (Mute until specific date):**
```json
{
  "is_muted": true,
  "unmute_date": "2024-12-05T00:00:00Z"
}
```

**Request Body (Unmute):**
```json
{
  "is_muted": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "is_muted": true,
    "unmute_date": "2024-12-05T00:00:00Z",
    "updated_at": "2024-12-01T19:00:00Z"
  }
}
```

---

#### **4.8 Evaluate Geofence Violation**
```http
POST /api/geofences/evaluate
```
**Purpose:** Check if given coordinates violate any geofences  
**Auth Required:** ✅ Yes  
**Use Case:** Test coordinates before vessel deployment, manual violation check  

**Request Body:**
```json
{
  "vessel_id": 1,
  "latitude": 50.4200,
  "longitude": -4.1800
}
```

**Response (No violations):**
```json
{
  "success": true,
  "data": {
    "violations": [],
    "position": {
      "latitude": 50.4200,
      "longitude": -4.1800
    }
  }
}
```

**Response (With violations):**
```json
{
  "success": true,
  "data": {
    "violations": [
      {
        "geofence_id": 2,
        "geofence_type": "keep_out_zone",
        "message": "Vessel entered keep-out zone"
      }
    ],
    "position": {
      "latitude": 50.4200,
      "longitude": -4.1800
    }
  }
}
```

---

### **🚨 5. ALERT RULES (7 endpoints)**

#### **5.1 Get All Alert Rules**
```http
GET /api/alerts/rules
GET /api/alerts/rules?vessel_id=1
GET /api/alerts/rules?enabled=true
GET /api/alerts/rules?vessel_id=1&enabled=true
```
**Purpose:** Get all alert rules with optional filtering  
**Auth Required:** ✅ Yes  
**Use Case:** Alert rules management page, filter rules by vessel or status  

**Query Parameters:**
- `vessel_id` (optional): Filter by vessel
- `enabled` (optional): Filter by enabled/disabled status
- `is_muted` (optional): Filter by muted status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "vessel_id": 1,
      "message_type_id": 1,
      "name": "Low Battery Warning",
      "field_name": "battery_voltage",
      "operator": "<",
      "threshold": 12.0,
      "consecutivity_enabled": true,
      "consecutivity_count": 3,
      "time_enabled": false,
      "time_window_mins": null,
      "time_count": null,
      "enabled": true,
      "is_muted": false,
      "unmute_date": null,
      "created_at": "2024-11-27T10:00:00Z",
      "updated_at": "2024-11-27T10:00:00Z",
      "vessel": {
        "id": 1,
        "name": "PC14"
      },
      "message_type": {
        "id": 1,
        "name": "Format 5"
      }
    }
    // ... 115 more rules
  ],
  "count": 116
}
```

**Example:**
```javascript
// Get all enabled rules for vessel 1
const response = await fetch(
  'https://ares-swirlier-yulanda.ngrok-free.dev/api/alerts/rules?vessel_id=1&enabled=true',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const { data, count } = await response.json();
console.log(`Found ${count} enabled rules for vessel 1`);
```

---

#### **5.2 Get Single Alert Rule**
```http
GET /api/alerts/rules/:id
```
**Purpose:** Get detailed information about specific alert rule  
**Auth Required:** ✅ Yes  
**Use Case:** Edit rule form, view rule configuration, check rule details  

**Example:** `GET /api/alerts/rules/1`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "vessel_id": 1,
    "message_type_id": 1,
    "name": "Low Battery Warning",
    "field_name": "battery_voltage",
    "operator": "<",
    "threshold": 12.0,
    "consecutivity_enabled": true,
    "consecutivity_count": 3,
    "time_enabled": false,
    "time_window_mins": null,
    "time_count": null,
    "enabled": true,
    "is_muted": false,
    "vessel": {
      "id": 1,
      "name": "PC14",
      "imei": "867530901234567"
    }
  }
}
```

---

#### **5.3 Create Alert Rule**
```http
POST /api/alerts/rules
```
**Purpose:** Create new alert rule for vessel (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Add new monitoring condition, set up custom alerts  

**Request Body (Simple threshold):**
```json
{
  "vessel_id": 1,
  "message_type_id": 1,
  "name": "High Temperature Alert",
  "field_name": "temperature",
  "operator": ">",
  "threshold": 30.0,
  "consecutivity_enabled": false,
  "time_enabled": false,
  "enabled": true
}
```

**Request Body (With consecutivity):**
```json
{
  "vessel_id": 1,
  "message_type_id": 1,
  "name": "Sustained Low Speed",
  "field_name": "speed",
  "operator": "<",
  "threshold": 3.0,
  "consecutivity_enabled": true,
  "consecutivity_count": 5,
  "time_enabled": false,
  "enabled": true
}
```

**Request Body (With time window):**
```json
{
  "vessel_id": 1,
  "message_type_id": 1,
  "name": "Frequent Position Changes",
  "field_name": "latitude",
  "operator": "!=",
  "threshold": 0,
  "consecutivity_enabled": false,
  "time_enabled": true,
  "time_window_mins": 60,
  "time_count": 10,
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 117,
    "vessel_id": 1,
    "name": "High Temperature Alert",
    "field_name": "temperature",
    "operator": ">",
    "threshold": 30.0,
    "enabled": true,
    "created_at": "2024-12-01T19:00:00Z"
  }
}
```

---

#### **5.4 Update Alert Rule**
```http
PUT /api/alerts/rules/:id
```
**Purpose:** Update existing alert rule (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Adjust thresholds, enable/disable rule, change conditions  

**Example:** `PUT /api/alerts/rules/117`

**Request Body:**
```json
{
  "threshold": 35.0,
  "consecutivity_enabled": true,
  "consecutivity_count": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 117,
    "threshold": 35.0,
    "consecutivity_enabled": true,
    "consecutivity_count": 3,
    "updated_at": "2024-12-01T19:10:00Z"
  }
}
```

---

#### **5.5 Delete Alert Rule**
```http
DELETE /api/alerts/rules/:id
```
**Purpose:** Remove alert rule from system (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Delete obsolete rules, remove test alerts  

**Example:** `DELETE /api/alerts/rules/117`

**Response:**
```json
{
  "success": true,
  "message": "Alert rule deleted successfully"
}
```

---

#### **5.6 Mute/Unmute Alert Rule**
```http
PATCH /api/alerts/rules/:id/mute
```
**Purpose:** Temporarily disable alert rule (Supervisor+)  
**Auth Required:** ✅ Yes (Supervisor or Admin role)  
**Use Case:** Silence alert during maintenance, planned low battery period  

**Example:** `PATCH /api/alerts/rules/1/mute`

**Request Body (Mute indefinitely):**
```json
{
  "is_muted": true
}
```

**Request Body (Mute until date):**
```json
{
  "is_muted": true,
  "unmute_date": "2024-12-05T00:00:00Z"
}
```

**Request Body (Unmute):**
```json
{
  "is_muted": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "is_muted": true,
    "unmute_date": "2024-12-05T00:00:00Z",
    "updated_at": "2024-12-01T19:00:00Z"
  }
}
```

---

#### **5.7 Get Alert Rule Statistics**
```http
GET /api/alerts/rules/stats
```
**Purpose:** Get statistics about alert rules (total, enabled, by type)  
**Auth Required:** ✅ Yes  
**Use Case:** Dashboard metrics, system overview  

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRules": 116,
    "enabledRules": 110,
    "disabledRules": 6,
    "mutedRules": 3,
    "byVessel": {
      "1": 20,
      "2": 18,
      "3": 19,
      "4": 17,
      "5": 21,
      "6": 21
    }
  }
}
```

---

### **📢 6. ALERT HISTORY & MANAGEMENT (6 endpoints)**

#### **6.1 Get Alert History**
```http
GET /api/alerts/history
GET /api/alerts/history?vessel_id=1
GET /api/alerts/history?resolved=false
GET /api/alerts/history?limit=50&offset=0
```
**Purpose:** Get historical alerts with filtering and pagination  
**Auth Required:** ✅ Yes  
**Use Case:** Alert history page, audit log, incident review  

**Query Parameters:**
- `vessel_id` (optional): Filter by vessel
- `alert_rule_id` (optional): Filter by specific rule
- `resolved` (optional): Filter by resolution status
- `acknowledged` (optional): Filter by acknowledgment status
- `start_date` (optional): Filter from date (ISO format)
- `end_date` (optional): Filter to date (ISO format)
- `limit` (optional, default: 50): Results per page
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "alert_rule_id": 5,
      "vessel_id": 1,
      "triggered_at": "2024-11-30T14:30:00Z",
      "triggered_value": 11.2,
      "message": "Battery voltage below 12.0V",
      "acknowledged": true,
      "acknowledged_by_id": 1,
      "acknowledged_at": "2024-11-30T14:35:00Z",
      "resolved": true,
      "resolved_by_id": 1,
      "resolved_at": "2024-11-30T15:00:00Z",
      "escalation_level": 1,
      "rule": {
        "id": 5,
        "name": "Low Battery Warning"
      },
      "vessel": {
        "id": 1,
        "name": "PC14"
      },
      "acknowledged_by": {
        "id": 1,
        "username": "admin"
      },
      "resolved_by": {
        "id": 1,
        "username": "admin"
      }
    }
    // ... more alerts
  ],
  "count": 1,
  "total": 1
}
```

**Example:**
```javascript
// Get unresolved alerts for vessel 1 from last 24 hours
const yesterday = new Date(Date.now() - 86400000).toISOString();
const response = await fetch(
  `https://ares-swirlier-yulanda.ngrok-free.dev/api/alerts/history?vessel_id=1&resolved=false&start_date=${yesterday}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

---

#### **6.2 Get Single Alert**
```http
GET /api/alerts/history/:id
```
**Purpose:** Get detailed information about specific alert  
**Auth Required:** ✅ Yes  
**Use Case:** Alert detail view, incident investigation  

**Example:** `GET /api/alerts/history/1`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "alert_rule_id": 5,
    "vessel_id": 1,
    "triggered_at": "2024-11-30T14:30:00Z",
    "triggered_value": 11.2,
    "message": "Battery voltage below 12.0V",
    "acknowledged": true,
    "acknowledged_by_id": 1,
    "acknowledged_at": "2024-11-30T14:35:00Z",
    "resolved": true,
    "resolved_by_id": 1,
    "resolved_at": "2024-11-30T15:00:00Z",
    "escalation_level": 1,
    "rule": {
      "id": 5,
      "name": "Low Battery Warning",
      "field_name": "battery_voltage",
      "operator": "<",
      "threshold": 12.0
    },
    "vessel": {
      "id": 1,
      "name": "PC14",
      "imei": "867530901234567"
    }
  }
}
```

---

#### **6.3 Get Active Alerts**
```http
GET /api/alerts/active
GET /api/alerts/active?vessel_id=1
```
**Purpose:** Get currently active (unresolved) alerts  
**Auth Required:** ✅ Yes  
**Use Case:** Active alerts dashboard, monitoring page, alert badge count  

**Query Parameters:**
- `vessel_id` (optional): Filter by vessel

**Response:**
```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

**Example with active alerts:**
```json
{
  "success": true,
  "data": [
    {
      "id": 25,
      "alert_rule_id": 12,
      "vessel_id": 7,
      "triggered_at": "2024-12-01T18:45:00Z",
      "triggered_value": 11.8,
      "message": "Battery voltage below 12.0V",
      "acknowledged": false,
      "resolved": false,
      "escalation_level": 1,
      "rule": {
        "id": 12,
        "name": "Low Battery Warning"
      },
      "vessel": {
        "id": 7,
        "name": "PB1 - MicroTransat"
      }
    }
  ],
  "count": 1
}
```

**Example:**
```javascript
// Check for active alerts every 10 seconds
setInterval(async () => {
  const response = await fetch('https://ares-swirlier-yulanda.ngrok-free.dev/api/alerts/active', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { count } = await response.json();
  updateAlertBadge(count);
}, 10000);
```

---

#### **6.4 Acknowledge Alert**
```http
POST /api/alerts/:id/acknowledge
```
**Purpose:** Mark alert as acknowledged (Supervisor+)  
**Auth Required:** ✅ Yes (Supervisor or Admin role)  
**Use Case:** Supervisor confirms they've seen the alert  

**Example:** `POST /api/alerts/25/acknowledge`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "acknowledged": true,
    "acknowledged_by_id": 1,
    "acknowledged_at": "2024-12-01T19:00:00Z"
  }
}
```

---

#### **6.5 Resolve Alert**
```http
POST /api/alerts/:id/resolve
```
**Purpose:** Mark alert as resolved (Supervisor+)  
**Auth Required:** ✅ Yes (Supervisor or Admin role)  
**Use Case:** Close alert after issue is fixed  

**Example:** `POST /api/alerts/25/resolve`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "resolved": true,
    "resolved_by_id": 1,
    "resolved_at": "2024-12-01T19:15:00Z"
  }
}
```

---

#### **6.6 Get Alert Statistics**
```http
GET /api/alerts/stats
GET /api/alerts/stats?vessel_id=1
GET /api/alerts/stats?start_date=2024-11-01&end_date=2024-12-01
```
**Purpose:** Get alert statistics and trends  
**Auth Required:** ✅ Yes  
**Use Case:** Dashboard metrics, reports, trend analysis  

**Query Parameters:**
- `vessel_id` (optional): Filter by vessel
- `start_date` (optional): Start date for stats
- `end_date` (optional): End date for stats

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 0,
    "active": 0,
    "acknowledged": 0,
    "resolved": 0,
    "byVessel": {},
    "byRule": {},
    "byDay": {}
  }
}
```

---

### **📡 7. TELEMETRY (5 endpoints)**

#### **7.1 Query Telemetry**
```http
GET /api/telemetry
GET /api/telemetry?vessel_id=7&limit=100
GET /api/telemetry?vessel_id=7&start_date=2024-12-01T00:00:00Z
```
**Purpose:** Query telemetry data with filters and pagination  
**Auth Required:** ✅ Yes  
**Use Case:** Telemetry history, data export, analysis  

**Query Parameters:**
- `vessel_id` (optional): Filter by vessel
- `message_type_id` (optional): Filter by message type
- `start_date` (optional): Start timestamp (ISO format)
- `end_date` (optional): End timestamp (ISO format)
- `limit` (optional, default: 50, max: 1000): Results per page
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1450,
      "vessel_id": 7,
      "message_type_id": 1,
      "timestamp": "2024-12-01T18:55:00Z",
      "latitude": 29.96612,
      "longitude": -20.07585,
      "data": {
        "battery_voltage": 12.8,
        "heading": 245.3,
        "speed": 5.2,
        "wind_speed": 12.5,
        "temperature": 22.3
      },
      "received_at": "2024-12-01T18:55:05Z",
      "vessel": {
        "id": 7,
        "name": "PB1 - MicroTransat"
      },
      "message_type": {
        "id": 1,
        "name": "Format 5"
      }
    }
    // ... more telemetry
  ],
  "count": 1,
  "total": 145
}
```

**Example:**
```javascript
// Get last 100 telemetry points for vessel 7
const response = await fetch(
  'https://ares-swirlier-yulanda.ngrok-free.dev/api/telemetry?vessel_id=7&limit=100',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const { data } = await response.json();
// Plot data on chart
plotTelemetry(data);
```

---

#### **7.2 Get Latest Telemetry for Vessel**
```http
GET /api/telemetry/vessel/:vesselId/latest
```
**Purpose:** Get most recent telemetry point for specific vessel  
**Auth Required:** ✅ Yes  
**Use Case:** Current vessel status, latest position, recent data fields  

**Example:** `GET /api/telemetry/vessel/7/latest`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1450,
    "vessel_id": 7,
    "message_type_id": 1,
    "timestamp": "2024-12-01T18:55:00Z",
    "latitude": 29.96612,
    "longitude": -20.07585,
    "data": {
      "battery_voltage": 12.8,
      "heading": 245.3,
      "speed": 5.2,
      "wind_speed": 12.5,
      "temperature": 22.3
    },
    "received_at": "2024-12-01T18:55:05Z"
  }
}
```

---

#### **7.3 Get Telemetry Statistics**
```http
GET /api/telemetry/vessel/:vesselId/stats
GET /api/telemetry/vessel/:vesselId/stats?start_date=2024-12-01T00:00:00Z
```
**Purpose:** Get statistics about vessel telemetry (count, min/max, averages)  
**Auth Required:** ✅ Yes  
**Use Case:** Vessel analytics, data quality check, monitoring coverage  

**Example:** `GET /api/telemetry/vessel/7/stats`

**Query Parameters:**
- `start_date` (optional): Start date for stats
- `end_date` (optional): End date for stats

**Response:**
```json
{
  "success": true,
  "data": {
    "vesselId": 7,
    "totalPoints": 145,
    "dateRange": {
      "first": "2024-11-28T10:54:54Z",
      "last": "2024-12-01T18:55:00Z"
    },
    "positionStats": {
      "latMin": 29.96612,
      "latMax": 30.7734,
      "lonMin": -20.07585,
      "lonMax": -19.5522
    }
  }
}
```

---

#### **7.4 Create Telemetry Entry**
```http
POST /api/telemetry
```
**Purpose:** Manually create telemetry entry (for testing)  
**Auth Required:** ✅ Yes  
**Use Case:** Testing alerts, simulating vessel data, development  

**Request Body:**
```json
{
  "vessel_id": 1,
  "message_type_id": 1,
  "latitude": 50.3650,
  "longitude": -4.1400,
  "timestamp": "2024-12-01T19:00:00Z",
  "data": {
    "battery_voltage": 12.5,
    "heading": 180.0,
    "speed": 5.0,
    "wind_speed": 10.0,
    "temperature": 20.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1451,
    "vessel_id": 1,
    "message_type_id": 1,
    "timestamp": "2024-12-01T19:00:00Z",
    "latitude": 50.3650,
    "longitude": -4.1400,
    "data": {...},
    "received_at": "2024-12-01T19:00:05Z"
  }
}
```

---

#### **7.5 Cleanup Old Telemetry**
```http
DELETE /api/telemetry/cleanup
DELETE /api/telemetry/cleanup?days=90
```
**Purpose:** Delete old telemetry data to save space (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Database maintenance, remove old data  

**Query Parameters:**
- `days` (optional, default: 90): Delete data older than X days

**Example:** `DELETE /api/telemetry/cleanup?days=180`

**Response:**
```json
{
  "success": true,
  "message": "Deleted telemetry older than 180 days",
  "deletedCount": 12500
}
```

---

### **🔄 8. LIVE DATA FETCHER (4 endpoints)**

#### **8.1 Get Data Fetcher Status**
```http
GET /api/data-fetcher/status
```
**Purpose:** Get status of background data fetching service  
**Auth Required:** ✅ Yes  
**Use Case:** Check if auto-fetch is running, see last fetch time  

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": false,
    "intervalMinutes": 5,
    "lastFetch": null,
    "nextFetch": null,
    "isRunning": false,
    "stats": {
      "totalFetches": 0,
      "successfulFetches": 0,
      "failedFetches": 0
    }
  }
}
```

**When running:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "intervalMinutes": 5,
    "lastFetch": "2024-12-01T18:55:00Z",
    "nextFetch": "2024-12-01T19:00:00Z",
    "isRunning": true,
    "stats": {
      "totalFetches": 145,
      "successfulFetches": 145,
      "failedFetches": 0
    }
  }
}
```

---

#### **8.2 Manually Trigger Data Fetch**
```http
POST /api/data-fetcher/trigger
```
**Purpose:** Manually trigger immediate data fetch from Oshen API (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Force immediate update, test API connection  

**Response:**
```json
{
  "success": true,
  "message": "Data fetch triggered successfully",
  "data": {
    "vesselsFound": 1,
    "telemetryStored": 1,
    "errors": []
  }
}
```

**Example:**
```javascript
// Trigger manual fetch
const response = await fetch(
  'https://ares-swirlier-yulanda.ngrok-free.dev/api/data-fetcher/trigger',
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const { data } = await response.json();
console.log(`Fetched data for ${data.vesselsFound} vessels`);
```

---

#### **8.3 Start Auto-Fetching Service**
```http
POST /api/data-fetcher/start
```
**Purpose:** Start automatic data fetching every 5 minutes (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Enable live data updates from Oshen API  

**Response:**
```json
{
  "success": true,
  "message": "Data fetcher started",
  "data": {
    "enabled": true,
    "intervalMinutes": 5,
    "nextFetch": "2024-12-01T19:05:00Z"
  }
}
```

---

#### **8.4 Stop Auto-Fetching Service**
```http
POST /api/data-fetcher/stop
```
**Purpose:** Stop automatic data fetching (Admin only)  
**Auth Required:** ✅ Yes (Admin role)  
**Use Case:** Disable live updates, maintenance mode  

**Response:**
```json
{
  "success": true,
  "message": "Data fetcher stopped",
  "data": {
    "enabled": false,
    "lastFetch": "2024-12-01T19:00:00Z"
  }
}
```

---

## 📊 **Quick Reference Summary**

### **By Authentication Level:**

**No Auth Required (2):**
- GET /health
- GET /api

**Any Authenticated User (22):**
- Authentication: GET /api/auth/me, PUT /api/auth/password
- Vessels: GET /api/vessels, GET /api/vessels/:id, GET /api/vessels/:id/stats
- Geofences: GET /api/geofences, GET /api/geofences/:id, GET /api/geofences/vessel/:id, POST /api/geofences/evaluate
- Alerts: GET /api/alerts/rules, GET /api/alerts/rules/:id, GET /api/alerts/rules/stats, GET /api/alerts/history, GET /api/alerts/history/:id, GET /api/alerts/active, GET /api/alerts/stats
- Telemetry: GET /api/telemetry, GET /api/telemetry/vessel/:id/latest, GET /api/telemetry/vessel/:id/stats, POST /api/telemetry
- Data Fetcher: GET /api/data-fetcher/status

**Supervisor+ Required (4):**
- Alerts: POST /api/alerts/:id/acknowledge, POST /api/alerts/:id/resolve
- Geofences: PATCH /api/geofences/:id/mute
- Alert Rules: PATCH /api/alerts/rules/:id/mute

**Admin Only (16):**
- Users: POST /api/auth/register, GET /api/auth/users, DELETE /api/auth/users/:id
- Vessels: POST /api/vessels, PUT /api/vessels/:id, DELETE /api/vessels/:id
- Geofences: POST /api/geofences, PUT /api/geofences/:id, DELETE /api/geofences/:id
- Alert Rules: POST /api/alerts/rules, PUT /api/alerts/rules/:id, DELETE /api/alerts/rules/:id
- Telemetry: DELETE /api/telemetry/cleanup
- Data Fetcher: POST /api/data-fetcher/trigger, POST /api/data-fetcher/start, POST /api/data-fetcher/stop

---

### **By Category:**

| Category | Endpoints | Auth Required |
|----------|-----------|---------------|
| Health & System | 2 | ❌ No |
| Authentication & Users | 6 | Mixed |
| Vessels | 6 | Yes (Admin for CUD) |
| Geofences | 8 | Yes (Admin for CUD) |
| Alert Rules | 7 | Yes (Admin for CUD) |
| Alert History | 6 | Yes (Supervisor+ for actions) |
| Telemetry | 5 | Yes |
| Data Fetcher | 4 | Yes (Admin for control) |
| **TOTAL** | **44** | - |

---

## 🔒 **Error Responses**

**All errors follow this format:**

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Data retrieved successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input, missing required fields |
| 401 | Unauthorized | No token or invalid token |
| 403 | Forbidden | Insufficient permissions for this action |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal server error, check logs |

---

## 🎯 **Testing Examples**

### **Quick Test Script (Browser Console):**

```javascript
// 1. Login
const loginRes = await fetch('https://ares-swirlier-yulanda.ngrok-free.dev/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'emperorpinguoshen' })
});
const { data: { token } } = await loginRes.json();
console.log('✅ Logged in');

// 2. Get vessels
const vesselsRes = await fetch('https://ares-swirlier-yulanda.ngrok-free.dev/api/vessels', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const vessels = await vesselsRes.json();
console.log(`✅ Found ${vessels.count} vessels`);

// 3. Get geofences
const geofencesRes = await fetch('https://ares-swirlier-yulanda.ngrok-free.dev/api/geofences', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const geofences = await geofencesRes.json();
console.log(`✅ Found ${geofences.count} geofences`);

// 4. Get active alerts
const alertsRes = await fetch('https://ares-swirlier-yulanda.ngrok-free.dev/api/alerts/active', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const alerts = await alertsRes.json();
console.log(`✅ Found ${alerts.count} active alerts`);

// 5. Get alert rules
const rulesRes = await fetch('https://ares-swirlier-yulanda.ngrok-free.dev/api/alerts/rules', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const rules = await rulesRes.json();
console.log(`✅ Found ${rules.count} alert rules`);
```

---

## 📞 **Support & Contact**

**Backend Developer:** Alvin (Backend Dev 1)  
**Current API URL:** https://ares-swirlier-yulanda.ngrok-free.dev/api  
**Login Credentials:** admin / emperorpinguoshen

**If you encounter issues:**
1. Check backend is running (GET /health)
2. Verify token is valid (GET /api/auth/me)
3. Check request format matches documentation
4. Look for error messages in response
5. Check browser console for CORS errors
6. Message backend dev with error details

---

## 🚀 **Live Data Status**

**Currently Available:**
- ✅ 7 Vessels (1 live, 6 test)
- ✅ 8 Geofences
- ✅ 116 Alert Rules
- ✅ Live telemetry from PB1 (updates every 5 mins)
- ✅ Complete API documentation
- ✅ Public internet access via ngrok

**PB1 - MicroTransat:**
- 🌊 Currently crossing Atlantic Ocean
- 📍 Latest position: ~29.97°N, 20.08°W
- 🔄 Auto-updates every 5 minutes
- 🎯 Destination: Caribbean

---

**All 44 endpoints documented and production-ready!** 🎉

**Last Updated:** December 1, 2024 19:30 UTC  
**Backend Status:** ✅ ONLINE AND OPERATIONAL
