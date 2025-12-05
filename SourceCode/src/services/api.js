const API_BASE_URL = 'https://ares-swirlier-yulanda.ngrok-free.dev/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = null;
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

  async getAlertRules(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request('/alerts/rules?' + params);
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
}

export default new ApiService();
