// Try ngrok first (for development), fallback to localhost (for markers/submission)
const API_URLS = [
  'https://ares-swirlier-yulanda.ngrok-free.dev/api',
  'http://localhost:3001/api',
  'http://localhost:3000/api'
];

class ApiService {
  constructor() {
    this.baseUrl = null; // Will be determined on first request
    this.token = null;
    this.urlIndex = 0; // Track which URL to try
  }

  async determineWorkingUrl() {
    // If we already found a working URL, use it
    if (this.baseUrl) return this.baseUrl;

    // Try ngrok first, then localhost
    for (let i = 0; i < API_URLS.length; i++) {
      try {
        const testUrl = API_URLS[i];
        console.log(`🔍 Testing backend connection: ${testUrl}`);

        // Simple connectivity test - try to fetch without auth
        await fetch(testUrl + '/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({ username: '', password: '' })
        });

        // Even if credentials are wrong (400), the server is reachable
        // Network errors will throw and move to catch block
        console.log(`✅ Backend reachable at: ${testUrl}`);
        this.baseUrl = testUrl;
        return testUrl;

      } catch (err) {
        console.log(`❌ Cannot reach: ${API_URLS[i]}`);
        // Continue to next URL
      }
    }

    // If all URLs failed, default to localhost anyway
    console.warn('⚠️ All backend URLs failed to respond, defaulting to localhost');
    this.baseUrl = API_URLS[1]; // localhost
    return this.baseUrl;
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('authToken');
    }
    return this.token;
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async request(endpoint, options = {}) {
    // Determine working URL on first request
    await this.determineWorkingUrl();

    const token = this.getToken();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token && { Authorization: 'Bearer ' + token }),
        ...options.headers,
      },
    };

    try {
      console.log('Making request to:', this.baseUrl + endpoint);
      console.log('Request config:', config);

      const response = await fetch(this.baseUrl + endpoint, config);

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          window.location.href = '/';
        }
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error Details:', {
        message: error.message,
        endpoint: this.baseUrl + endpoint,
        error: error
      });

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error - Cannot connect to backend. Check if backend is running.');
      }

      throw error;
    }
  }

  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.data.token);
    return data;
  }

  async logout() {
    this.clearToken();
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  async getVessels() {
    return this.request('/vessels');
  }

  async getVessel(id) {
    return this.request('/vessels/' + id);
  }

  async getVesselStats(id) {
    return this.request('/vessels/' + id + '/stats');
  }

  async createVessel(vesselData) {
    return this.request('/vessels', {
      method: 'POST',
      body: JSON.stringify(vesselData)
    });
  }

  async updateVessel(id, vesselData) {
    return this.request('/vessels/' + id, {
      method: 'PUT',
      body: JSON.stringify(vesselData)
    });
  }

  async deleteVessel(id) {
    return this.request('/vessels/' + id, {
      method: 'DELETE'
    });
  }

  async getGeofences() {
    return this.request('/geofences');
  }

  async getGeofencesByVessel(vesselId) {
    return this.request('/geofences/vessel/' + vesselId);
  }

  async createGeofence(data) {
    return this.request('/geofences', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateGeofence(id, data) {
    return this.request('/geofences/' + id, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteGeofence(id) {
    return this.request('/geofences/' + id, { method: 'DELETE' });
  }

  async muteGeofence(id, data) {
    return this.request('/geofences/' + id + '/mute', { method: 'PATCH', body: JSON.stringify(data) });
  }

  async getAlertRules(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request('/alerts/rules?' + params);
  }

  async createAlertRule(alertData) {
    return this.request('/alerts/rules', {
      method: 'POST',
      body: JSON.stringify(alertData)
    });
  }

  async updateAlertRule(id, alertData) {
    return this.request('/alerts/rules/' + id, {
      method: 'PUT',
      body: JSON.stringify(alertData)
    });
  }

  async deleteAlertRule(id) {
    return this.request('/alerts/rules/' + id, {
      method: 'DELETE'
    });
  }

  async getActiveAlerts() {
    return this.request('/alerts/active');
  }

  async getAlertHistory(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request('/alerts/history?' + params);
  }

  async acknowledgeAlert(id) {
    return this.request('/alerts/' + id + '/acknowledge', {
      method: 'POST',
    });
  }

  async resolveAlert(id) {
    return this.request('/alerts/' + id + '/resolve', {
      method: 'POST',
    });
  }

  async getLatestTelemetry(vesselId) {
    return this.request('/telemetry/vessel/' + vesselId + '/latest');
  }

  async getTelemetryHistory(vesselId, limit = 50) {
    return this.request('/telemetry?vessel_id=' + vesselId + '&limit=' + limit);
  }

  async getTelemetryForPeriod(vesselId, hours) {
    // Scale the record limit with the time window (assume up to ~10 reports/hr, 2× buffer)
    const limit = Math.min(Math.ceil(hours * 10 * 2), 10000);
    return this.request('/telemetry?vessel_id=' + vesselId + '&limit=' + limit);
  }

  // User Management APIs
  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async getAllUsers() {
    return this.request('/auth/users');
  }

  async createUser(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(userId) {
    return this.request('/auth/users/' + userId, {
      method: 'DELETE'
    });
  }

  async updatePagerId(userId, pagerId) {
    return this.request('/auth/users/' + userId + '/pager-id', {
      method: 'PUT',
      body: JSON.stringify({ pager_id: pagerId })
    });
  }

  // Compound Alert Rules
  async getCompoundRules(vesselId) {
    const params = vesselId ? '?vessel_id=' + vesselId : '';
    return this.request('/alerts/compound-rules' + params);
  }

  async createCompoundRule(data) {
    return this.request('/alerts/compound-rules', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateCompoundRule(id, data) {
    return this.request('/alerts/compound-rules/' + id, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteCompoundRule(id) {
    return this.request('/alerts/compound-rules/' + id, {
      method: 'DELETE'
    });
  }

  async getActiveCompoundAlerts(vesselId) {
    const params = vesselId ? '?vessel_id=' + vesselId : '';
    return this.request('/alerts/compound-active' + params);
  }

  async acknowledgeCompoundAlert(id) {
    return this.request('/alerts/compound/' + id + '/acknowledge', {
      method: 'POST'
    });
  }

  async resolveCompoundAlert(id) {
    return this.request('/alerts/compound/' + id + '/resolve', {
      method: 'POST'
    });
  }

  async triggerTestAlert(vesselId, message) {
    return this.request('/alerts/trigger-test', {
      method: 'POST',
      body: JSON.stringify({ vessel_id: vesselId, ...(message ? { message } : {}) })
    });
  }

  async getPageLog(filters = {}) {
    const params = new URLSearchParams(filters);
    const qs = params.toString();
    return this.request('/pagem/page-log' + (qs ? '?' + qs : ''));
  }

  async refreshPageLogEntry(id) {
    return this.request('/pagem/page-log/' + id + '/refresh');
  }

  async getPagemStatus() {
    return this.request('/pagem/status');
  }

  async getPagemApiKey() {
    return this.request('/pagem/api-key');
  }

  async updatePagemApiKey(apiKey) {
    return this.request('/pagem/api-key', {
      method: 'PUT',
      body: JSON.stringify({ api_key: apiKey })
    });
  }

  async sendTestPage(pagerId = null) {
    return this.request('/pagem/test-page', {
      method: 'POST',
      body: JSON.stringify(pagerId ? { pager_id: pagerId } : {})
    });
  }

  async getPageStatus(eventId) {
    return this.request('/pagem/page-status', {
      method: 'POST',
      body: JSON.stringify({ eventId })
    });
  }
}

export default new ApiService();
