/**
 * Pagem API Integration Test Script
 *
 * Run from the backend directory:
 *   node test-pagem.js
 *
 * Tests:
 *   1. Connectivity  — GET  /demo/hello
 *   2. API key check — POST /test/apiKey
 *   3. Send a page   — POST /page/send  (requires a valid pagerId)
 */

require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.PAGE_AUTH_TOKEN || '';
const BASE_URL = 'https://www.pagem.com/api/v2';

// ── Replace with an actual Pagee API ID from your Pagem dashboard ──────────
const TEST_PAGER_ID = process.env.TEST_PAGER_ID || '8037';
// ──────────────────────────────────────────────────────────────────────────

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'authentication': API_KEY }
});

async function testConnectivity() {
  console.log('\n--- Test 1: Connectivity (GET /demo/hello) ---');
  try {
    const res = await axios.get(`${BASE_URL}/demo/hello`);
    console.log('✅ Connected to Pagem API:', res.data);
  } catch (err) {
    console.error('❌ Connectivity failed:', err.message);
  }
}

async function testApiKey() {
  console.log('\n--- Test 2: API Key Validation (POST /test/apiKey) ---');
  if (!API_KEY) {
    console.warn('⚠️  PAGE_AUTH_TOKEN is not set in .env');
    return;
  }
  try {
    const res = await client.post('/test/apiKey');
    console.log('✅ API key valid:', res.data);
  } catch (err) {
    console.error('❌ API key invalid or request failed:', err.message);
    if (err.response) console.error('   Response:', err.response.data);
  }
}

async function testSendPage() {
  console.log('\n--- Test 3: Send Page (POST /page/send) ---');
  if (!API_KEY) {
    console.warn('⚠️  PAGE_AUTH_TOKEN is not set in .env — skipping');
    return;
  }
  if (TEST_PAGER_ID === 'YOUR_PAGEE_API_ID') {
    console.warn('⚠️  Set TEST_PAGER_ID env var or edit this script with a real Pagee API ID to test sending');
    return;
  }

  try {
    const body = new URLSearchParams();
    body.append('id', TEST_PAGER_ID);
    body.append('message', 'OSHEN TEST: Pagem integration working correctly!');

    const res = await client.post('/page/send', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (res.data && res.data.success) {
      console.log(`✅ Page sent! EventId: ${res.data.eventId}`);
    } else {
      console.error('❌ Page send returned success:false:', res.data);
    }
  } catch (err) {
    console.error('❌ Page send failed:', err.message);
    if (err.response) console.error('   Response:', err.response.data);
  }
}

(async () => {
  console.log('=== Pagem API Integration Tests ===');
  console.log(`Using API key: ${API_KEY ? API_KEY.slice(0, 8) + '...' : '(not set)'}`);

  await testConnectivity();
  await testApiKey();
  await testSendPage();

  console.log('\n=== Tests complete ===');
  process.exit(0);
})();
