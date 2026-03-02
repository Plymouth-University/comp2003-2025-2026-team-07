const { prisma } = require('../config/database');
const oshenApiClient = require('./oshenApiClient');
const alertEvaluator = require('./alertEvaluator');

/**
 * Background service that fetches live data from Oshen API
 * and stores it in the local database
 */
class DataFetcherService {
  constructor() {
    this.pollingInterval = parseInt(process.env.DATA_FETCH_INTERVAL_MINS || '5') * 60 * 1000;
    this.isRunning = false;
    this.intervalId = null;
    this.lastFetchTime = null;
    this.fetchCount = 0;
  }

  /**
   * Store telemetry data in database
   * @param {number} vesselId - Local vessel ID
   * @param {Object} entry - Telemetry entry from Oshen API
   */
  async storeTelemetry(vesselId, entry) {
    try {
      const payload = entry.payload || entry;
      
      // Determine message type (you may need to adjust this logic)
      let messageTypeId = 1; // Default to Format 5
      
      // Check if vessel uses Format 3 (like PS1)
      const vessel = await prisma.vessels.findUnique({
        where: { id: vesselId },
        include: {
          vessel_message_types: {
            include: { message_types: true }
          }
        }
      });

      if (vessel && vessel.vessel_message_types.length > 0) {
        messageTypeId = vessel.vessel_message_types[0].message_type_id;
      }

      // Create telemetry entry
      const telemetryEntry = await prisma.telemetry.create({
        data: {
          vessel_id: vesselId,
          message_type_id: messageTypeId,
          timestamp: new Date(payload.timestamp * 1000),
          latitude: payload.latitude || null,
          longitude: payload.longitude || null,
          data: payload, // Store full payload as JSONB
          received_at: new Date()
        }
      });

      // Update vessel's latest position
      if (payload.latitude && payload.longitude) {
        await prisma.vessels.update({
          where: { id: vesselId },
          data: {
            latest_position: {
              latitude: payload.latitude,
              longitude: payload.longitude,
              timestamp: new Date(payload.timestamp * 1000)
            },
            last_check_in_at: new Date()
          }
        });
      }

      console.log(`✅ Stored telemetry for vessel ${vesselId} (${vessel?.name})`);

      // Evaluate alert rules against this new telemetry
      try {
        await alertEvaluator.evaluateTelemetry(telemetryEntry.id);
      } catch (error) {
        console.error(`⚠️  Error evaluating alerts for telemetry ${telemetryEntry.id}:`, error.message);
        // Don't fail the whole operation if alert evaluation fails
      }

      return true;
    } catch (error) {
      console.error(`❌ Error storing telemetry for vessel ${vesselId}:`, error.message);
      return false;
    }
  }

  /**
   * Fetch and store data for a single vessel
   * @param {Object} vessel - Vessel object from database
   */
  async fetchVesselData(vessel) {
    try {
      console.log(`📡 Fetching data for vessel: ${vessel.name} (IMEI: ${vessel.imei})`);

      // Find Oshen vessel ID by IMEI
      const oshenVesselId = await oshenApiClient.findVesselIdByImei(vessel.imei);
      
      if (!oshenVesselId) {
        console.warn(`⚠️ Oshen vessel ID not found for ${vessel.name} (IMEI: ${vessel.imei})`);
        return { vessel: vessel.name, success: false, reason: 'Vessel not found in Oshen API' };
      }

      // Fetch last 60 minutes of history
      const history = await oshenApiClient.fetchVesselHistory(oshenVesselId, 60, 10);

      if (history.length === 0) {
        console.warn(`⚠️ No recent data for ${vessel.name}`);
        return { vessel: vessel.name, success: false, reason: 'No recent data' };
      }

      // Get the most recent entry only (to avoid duplicates)
      const latestEntry = history[0];
      
      // Check if we already have this timestamp
      const existingEntry = await prisma.telemetry.findFirst({
        where: {
          vessel_id: vessel.id,
          timestamp: new Date(latestEntry.payload.timestamp * 1000)
        }
      });

      if (existingEntry) {
        console.log(`ℹ️ Already have latest data for ${vessel.name}, skipping...`);
        return { vessel: vessel.name, success: true, reason: 'Already up to date', stored: 0 };
      }

      // Store the latest entry
      const stored = await this.storeTelemetry(vessel.id, latestEntry);
      
      return { 
        vessel: vessel.name, 
        success: stored, 
        stored: stored ? 1 : 0,
        timestamp: new Date(latestEntry.payload.timestamp * 1000)
      };
    } catch (error) {
      console.error(`❌ Error fetching data for ${vessel.name}:`, error.message);
      return { vessel: vessel.name, success: false, reason: error.message };
    }
  }

  /**
   * Fetch data for all vessels
   */
  async fetchAllVessels() {
    const fetchStartTime = Date.now();
    this.fetchCount++;

    console.log('\n' + '='.repeat(70));
    console.log(`🔄 DATA FETCH CYCLE #${this.fetchCount} - ${new Date().toISOString()}`);
    console.log('='.repeat(70));

    try {
      // Get all vessels from local database
      const vessels = await prisma.vessels.findMany({
        select: { 
          id: true, 
          name: true, 
          imei: true,
          at_sea_status: true 
        }
      });

      console.log(`📊 Found ${vessels.length} vessels in database`);

      // Only fetch data for vessels that are at sea
      const activeVessels = vessels.filter(v => v.at_sea_status);
      console.log(`🚢 ${activeVessels.length} vessels are currently at sea`);

      if (activeVessels.length === 0) {
        console.log('⚠️ No vessels at sea, skipping fetch cycle');
        return;
      }

      // Fetch data for each vessel
      const results = [];
      for (const vessel of activeVessels) {
        const result = await this.fetchVesselData(vessel);
        results.push(result);
        
        // Small delay between vessels to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Summary
      const successful = results.filter(r => r.success).length;
      const totalStored = results.reduce((sum, r) => sum + (r.stored || 0), 0);
      
      const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(2);
      
      console.log('\n' + '-'.repeat(70));
      console.log(`✅ Fetch cycle complete in ${fetchDuration}s`);
      console.log(`📊 Results: ${successful}/${activeVessels.length} vessels successful`);
      console.log(`💾 Stored ${totalStored} new telemetry entries`);
      console.log('-'.repeat(70) + '\n');

      this.lastFetchTime = new Date();

      return {
        success: true,
        vesselsProcessed: activeVessels.length,
        successfulFetches: successful,
        entriesStored: totalStored,
        duration: fetchDuration,
        results
      };
    } catch (error) {
      console.error('❌ Error in fetch cycle:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start the background data fetcher
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Data fetcher is already running');
      return;
    }

    console.log('\n' + '='.repeat(70));
    console.log('🚀 STARTING OSHEN DATA FETCHER SERVICE');
    console.log('='.repeat(70));
    console.log(`⏱️ Polling interval: ${this.pollingInterval / 60000} minutes`);
    console.log(`🌐 Oshen API: ${process.env.OSHEN_API_BASE_URL}`);
    console.log('='.repeat(70) + '\n');

    this.isRunning = true;

    // Fetch immediately on start
    this.fetchAllVessels();

    // Then fetch at regular intervals
    this.intervalId = setInterval(() => {
      this.fetchAllVessels();
    }, this.pollingInterval);

    console.log('✅ Data fetcher service started successfully\n');
  }

  /**
   * Stop the background data fetcher
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Data fetcher is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;

    console.log('\n' + '='.repeat(70));
    console.log('🛑 STOPPED OSHEN DATA FETCHER SERVICE');
    console.log('='.repeat(70));
    console.log(`📊 Total fetch cycles completed: ${this.fetchCount}`);
    console.log(`⏰ Last fetch: ${this.lastFetchTime ? this.lastFetchTime.toISOString() : 'Never'}`);
    console.log('='.repeat(70) + '\n');
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pollingIntervalMinutes: this.pollingInterval / 60000,
      lastFetchTime: this.lastFetchTime,
      totalFetchCycles: this.fetchCount,
      cacheStats: oshenApiClient.getCacheStats()
    };
  }

  /**
   * Manually trigger a fetch cycle
   * @returns {Promise<Object>} Fetch results
   */
  async triggerManualFetch() {
    console.log('🔧 Manual fetch triggered');
    return await this.fetchAllVessels();
  }
}

// Export singleton instance
module.exports = new DataFetcherService();
