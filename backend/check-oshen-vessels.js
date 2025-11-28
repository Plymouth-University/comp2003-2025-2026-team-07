// Diagnostic script to check what vessels are available in Oshen API
// Run this in Node.js to see what vessels you have access to

require('dotenv').config();
const axios = require('axios');

const OSHEN_API_BASE_URL = process.env.OSHEN_API_BASE_URL || 'https://mission.oshendata.com/papi';
const OSHEN_API_KEY = process.env.OSHEN_API_KEY;

async function checkOshenVessels() {
  console.log('🔍 Checking Oshen API for available vessels...\n');
  console.log(`API URL: ${OSHEN_API_BASE_URL}`);
  console.log(`API Key: ${OSHEN_API_KEY ? OSHEN_API_KEY.substring(0, 20) + '...' : 'NOT SET'}\n`);

  if (!OSHEN_API_KEY) {
    console.error('❌ OSHEN_API_KEY is not set in .env file!');
    return;
  }

  try {
    // Fetch vessels from Oshen API
    const response = await axios.get(`${OSHEN_API_BASE_URL}/vessel/`, {
      params: {
        page: 1,
        limit: 100
      },
      headers: {
        'accept': 'application/json',
        'x-api-key': OSHEN_API_KEY
      },
      timeout: 10000
    });

    if (response.data.success && response.data.data) {
      const vessels = response.data.data;
      
      console.log('='.repeat(80));
      console.log(`✅ SUCCESS! Found ${vessels.length} vessel(s) in Oshen API`);
      console.log('='.repeat(80));
      console.log();

      if (vessels.length === 0) {
        console.log('⚠️  No vessels found in Oshen API for this account.');
        console.log('   This API key might not have access to any vessels yet.');
        return;
      }

      // Display vessel details
      console.log('📋 AVAILABLE VESSELS:\n');
      
      vessels.forEach((vessel, index) => {
        console.log(`${index + 1}. ${vessel.name || 'Unnamed'}`);
        console.log(`   ID: ${vessel.id}`);
        console.log(`   IMEI: ${vessel.imei || 'N/A'}`);
        console.log(`   Type: ${vessel.type || 'N/A'}`);
        console.log(`   Status: ${vessel.status || 'N/A'}`);
        console.log();
      });

      console.log('='.repeat(80));
      console.log('📊 COMPARISON WITH YOUR DATABASE:\n');

      // Database IMEIs
      const dbIMEIs = [
        { name: 'PC14', imei: '301434061995380' },
        { name: 'PC13', imei: '301434061994390' },
        { name: 'PC7', imei: '301434061999380' },
        { name: 'PC10', imei: '301434061991400' },
        { name: 'PC6', imei: '301434061990400' },
        { name: 'PS1', imei: '301434061017240' },
        { name: 'PB1', imei: '301434061997390' },
        
      ];

      console.log('Your database has:');
      dbIMEIs.forEach(v => console.log(`  - ${v.name}: ${v.imei}`));
      console.log();

      console.log('Oshen API has:');
      vessels.forEach(v => console.log(`  - ${v.name || 'Unnamed'}: ${v.imei || 'No IMEI'}`));
      console.log();

      // Check for matches
      const matches = [];
      const missing = [];

      dbIMEIs.forEach(dbVessel => {
        const found = vessels.find(apiVessel => apiVessel.imei === dbVessel.imei);
        if (found) {
          matches.push(dbVessel);
        } else {
          missing.push(dbVessel);
        }
      });

      if (matches.length > 0) {
        console.log(`✅ MATCHED (${matches.length}):`);
        matches.forEach(v => console.log(`   ${v.name} (${v.imei})`));
        console.log();
      }

      if (missing.length > 0) {
        console.log(`❌ NOT FOUND IN OSHEN API (${missing.length}):`);
        missing.forEach(v => console.log(`   ${v.name} (${v.imei})`));
        console.log();
      }

      console.log('='.repeat(80));
      console.log('\n💡 NEXT STEPS:\n');

      if (matches.length === 0) {
        console.log('⚠️  No IMEIs match between database and Oshen API.');
        console.log('   Options:');
        console.log('   1. Update database IMEIs to match Oshen vessels');
        console.log('   2. Contact Oshen to verify correct API key');
        console.log('   3. Use test data for frontend development');
      } else if (missing.length > 0) {
        console.log(`✅ ${matches.length} vessel(s) will work with live data`);
        console.log(`⚠️  ${missing.length} vessel(s) need IMEI updates in database`);
      } else {
        console.log('✅ All vessels matched! Live data should work!');
      }

    } else {
      console.error('❌ Unexpected API response format:', response.data);
    }

  } catch (error) {
    console.error('\n❌ ERROR:\n');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${error.response.statusText}`);
      console.error('Response:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('\n⚠️  API Key is invalid or expired');
      } else if (error.response.status === 403) {
        console.error('\n⚠️  API Key does not have permission to access vessels');
      }
    } else if (error.request) {
      console.error('No response received from Oshen API');
      console.error('Check your internet connection and API URL');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the diagnostic
checkOshenVessels();
