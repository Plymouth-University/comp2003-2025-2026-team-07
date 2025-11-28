const axios = require('axios');

/**
 * Oshen API Client - Node.js version
 * Connects to Oshen's external API to fetch live vessel data
 */
class OshenApiClient {
  constructor() {
    this.apiBaseUrl = process.env.OSHEN_API_BASE_URL || 'https://mission.oshendata.com/papi';
    this.apiKey = process.env.OSHEN_API_KEY || '';
    this.timeout = 10000; // 10 second timeout
    
    // Cache for vessel ID lookups (1 hour TTL)
    this.vesselCache = new Map();
    this.vesselCacheTimestamps = new Map();
    this.cacheTTL = 3600000; // 1 hour in milliseconds
    
    // Create axios instance with connection pooling
    this.client = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: this.timeout,
      headers: {
        'accept': 'application/json',
        'x-api-key': this.apiKey
      }
    });
  }

  /**
   * Fetch list of vessels from Oshen API
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Results per page (default: 20)
   * @param {string} search - Search term (optional)
   * @returns {Promise<Array>} List of vessels
   */
  async fetchVesselList(page = 1, limit = 20, search = null) {
    try {
      const params = { page, limit };
      if (search) params.search = search;

      console.log(`📡 Fetching vessel list from Oshen API...`);
      const response = await this.client.get('/vessel/', { params });

      if (response.data.success && response.data.data) {
        console.log(`✅ Fetched ${response.data.data.length} vessels from Oshen API`);
        return response.data.data;
      } else {
        console.error('❌ Failed to parse vessel data from Oshen API response');
        return [];
      }
    } catch (error) {
      console.error(`❌ Error fetching vessels from Oshen API: ${error.message}`);
      return [];
    }
  }

  /**
   * Find vessel ID by IMEI with caching
   * @param {string} imei - Vessel IMEI
   * @returns {Promise<number|null>} Vessel ID or null
   */
  async findVesselIdByImei(imei) {
    // Check cache first
    const currentTime = Date.now();
    
    if (this.vesselCache.has(imei)) {
      const cacheTime = this.vesselCacheTimestamps.get(imei);
      if (currentTime - cacheTime < this.cacheTTL) {
        const vesselId = this.vesselCache.get(imei);
        console.log(`💾 Using cached vessel ID ${vesselId} for IMEI ${imei}`);
        return vesselId;
      } else {
        // Cache expired
        console.log(`⏰ Cache expired for IMEI ${imei}, refreshing...`);
        this.vesselCache.delete(imei);
        this.vesselCacheTimestamps.delete(imei);
      }
    }

    try {
      // Fetch all vessels (assuming not too many)
      const vessels = await this.fetchVesselList(1, 100);
      
      // Find vessel with matching IMEI
      const vessel = vessels.find(v => v.imei === imei);
      
      if (vessel) {
        const vesselId = vessel.id;
        
        // Cache the result
        this.vesselCache.set(imei, vesselId);
        this.vesselCacheTimestamps.set(imei, currentTime);
        
        console.log(`✅ Found and cached Oshen vessel ID ${vesselId} for IMEI ${imei}`);
        return vesselId;
      } else {
        // Cache negative result for 5 minutes
        this.vesselCache.set(imei, null);
        this.vesselCacheTimestamps.set(imei, currentTime - this.cacheTTL + 300000);
        
        console.warn(`⚠️ No vessel found on Oshen API with IMEI ${imei}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error finding vessel by IMEI ${imei}: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch vessel history from Oshen API
   * @param {number} vesselId - Oshen vessel ID
   * @param {number} minutes - Minutes of history to fetch (default: 60)
   * @param {number} limit - Max history points (default: 100)
   * @returns {Promise<Array>} List of history entries
   */
  async fetchVesselHistory(vesselId, minutes = 60, limit = 100) {
    try {
      console.log(`📡 Fetching history for Oshen vessel ${vesselId} (last ${minutes} minutes)...`);
      
      const currentTime = Math.floor(Date.now() / 1000);
      const timeThreshold = currentTime - (minutes * 60);

      const response = await this.client.get(`/vessel/history/${vesselId}`, {
        params: {
          limit: limit,
          sort_by: 'timestamp',
          sort_as: 'desc'
        }
      });

      if (response.data.success && response.data.data) {
        // Filter by timestamp
        const filteredData = response.data.data.filter(
          entry => entry.payload && entry.payload.timestamp >= timeThreshold
        );
        
        console.log(`✅ Fetched ${filteredData.length} history points for Oshen vessel ${vesselId}`);
        return filteredData;
      } else {
        console.warn(`⚠️ No history found for Oshen vessel ${vesselId}`);
        return [];
      }
    } catch (error) {
      console.error(`❌ Error fetching history for Oshen vessel ${vesselId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get vessel data for a platform by IMEI
   * @param {string} imei - Vessel IMEI
   * @param {number} minTimeHorizonMins - Minimum time horizon in minutes
   * @param {number} minNumberMessages - Minimum number of messages
   * @returns {Promise<Array>} Normalized vessel data
   */
  async getVesselDataForPlatform(imei, minTimeHorizonMins, minNumberMessages) {
    const startTime = Date.now();

    // Find vessel ID based on IMEI
    const vesselId = await this.findVesselIdByImei(imei);
    
    if (!vesselId) {
      console.error(`❌ Could not find Oshen vessel ID for IMEI ${imei}`);
      return [];
    }

    // Fetch vessel history
    const historyData = await this.fetchVesselHistory(
      vesselId,
      minTimeHorizonMins,
      minNumberMessages * 2 // Fetch more than needed
    );

    if (historyData.length === 0) {
      console.warn(`⚠️ No history data found for Oshen vessel ${vesselId}`);
      return [];
    }

    // Convert to normalized format
    const normalizedData = historyData.map(entry => {
      const payload = entry.payload;
      
      const dataEntry = {
        Timestamp: new Date(payload.timestamp * 1000),
        timestamp: payload.timestamp
      };

      // Add latitude and longitude
      if (payload.latitude !== undefined && payload.longitude !== undefined) {
        dataEntry.Latitude = payload.latitude;
        dataEntry.Longitude = payload.longitude;
        dataEntry.latitude = payload.latitude;
        dataEntry.longitude = payload.longitude;
      }

      // Add all other payload fields in multiple formats for compatibility
      for (const [key, value] of Object.entries(payload)) {
        if (!['timestamp', 'latitude', 'longitude'].includes(key)) {
          // PascalCase
          const pascalKey = key.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
          
          // Title Case with Spaces
          const titleKey = key.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          dataEntry[pascalKey] = value;
          dataEntry[titleKey] = value;
          dataEntry[key] = value;
        }
      }

      return dataEntry;
    });

    // Sort by timestamp (oldest first)
    normalizedData.sort((a, b) => a.Timestamp - b.Timestamp);

    // Limit to minimum required messages
    const limitedData = normalizedData.slice(-minNumberMessages);

    const totalTime = Date.now() - startTime;
    console.log(`✅ Retrieved ${limitedData.length} messages for IMEI ${imei} in ${(totalTime / 1000).toFixed(2)}s`);

    return limitedData;
  }

  /**
   * Clear the vessel ID cache
   */
  clearCache() {
    this.vesselCache.clear();
    this.vesselCacheTimestamps.clear();
    console.log('🗑️ Vessel ID cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    const currentTime = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [imei, cacheTime] of this.vesselCacheTimestamps.entries()) {
      if (currentTime - cacheTime < this.cacheTTL) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.vesselCache.size,
      validEntries,
      expiredEntries,
      cacheHitPotential: `${((validEntries / Math.max(this.vesselCache.size, 1)) * 100).toFixed(1)}%`
    };
  }
}

// Export singleton instance
module.exports = new OshenApiClient();
