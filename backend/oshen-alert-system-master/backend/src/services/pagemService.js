const axios = require('axios');
const { prisma } = require('../config/database');
const { encrypt, decrypt, maskKey } = require('../utils/encryption');

/** @param {number} ms @returns {Promise<void>} */
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Pagem API Service
 *
 * Wraps the Pagem REST API v2 for sending mobile pages.
 *
 * API base: https://www.pagem.com/api/v2/
 * Auth: POST header  `authentication: <api_key>`
 *
 * Key priority (highest -> lowest):
 *   1. system_settings table in DB  (set via PUT /api/pagem/api-key)
 *   2. PAGEM_API_KEY environment variable
 */
class PagemService {
  constructor() {
    this.baseUrl = process.env.PAGEM_BASE_URL || 'https://www.pagem.com/api/v2';
    this.apiKey = process.env.PAGEM_API_KEY || null;
    this.enabled = !!this.apiKey;
    this._keySource = this.apiKey ? 'env' : 'none';
    this._pollerTimer = null;

    if (!this.enabled) {
      console.warn('PAGEM_API_KEY not set - paging is disabled until a key is configured');
    }
  }

  // -- Key management ---------------------------------------------------------

  async init() {
    try {
      const row = await prisma.system_settings.findUnique({
        where: { key: 'pagem_api_key' }
      });

      if (row) {
        const decrypted = decrypt(row.value);
        this.apiKey = decrypted;
        this.enabled = true;
        this._keySource = 'database';
        console.log('Pagem API key loaded from database');
      } else if (this.apiKey) {
        this._keySource = 'env';
        console.log('Pagem API key loaded from environment variable');
      }
    } catch (err) {
      console.error('Failed to load Pagem API key from DB:', err.message);
    }
  }

  async saveKey(newKey) {
    const encrypted = encrypt(newKey);
    await prisma.system_settings.upsert({
      where: { key: 'pagem_api_key' },
      update: { value: encrypted, updated_at: new Date() },
      create: { key: 'pagem_api_key', value: encrypted }
    });
    this.apiKey = newKey;
    this.enabled = true;
    this._keySource = 'database';
    console.log('Pagem API key updated and saved to database');
  }

  async getKeyInfo() {
    const row = await prisma.system_settings.findUnique({
      where: { key: 'pagem_api_key' }
    });

    if (row) {
      const decrypted = decrypt(row.value);
      return {
        configured: true,
        source: 'database',
        maskedKey: maskKey(decrypted),
        updatedAt: row.updated_at
      };
    }

    if (process.env.PAGEM_API_KEY) {
      return {
        configured: true,
        source: 'env',
        maskedKey: maskKey(process.env.PAGEM_API_KEY),
        updatedAt: null
      };
    }

    return { configured: false, source: 'none', maskedKey: null, updatedAt: null };
  }

  // -- Internal helpers -------------------------------------------------------

  _authConfig() {
    return { headers: { authentication: this.apiKey } };
  }

  async _post(path, params = {}) {
    const url = `${this.baseUrl}${path}`;
    const formData = new URLSearchParams(params).toString();
    const response = await axios.post(url, formData, {
      headers: {
        ...this._authConfig().headers,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  // -- Public API wrappers ----------------------------------------------------

  async testApiKey() {
    if (!this.enabled) throw new Error('Pagem API key not configured');

    try {
      const data = await this._post('/test/apiKey');

      let message = 'API key valid';
      if (data.data) {
        try {
          const inner = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
          message = inner.message || message;
        } catch (_) {}
      } else if (data.message) {
        message = data.message;
      }

      console.log('Pagem API key valid:', message);
      return { success: data.success, message };
    } catch (err) {
      const msg = err.response?.data?.errorMessage || err.response?.data?.message || err.message;
      console.error('Pagem API key test failed:', msg);
      throw new Error(`Pagem API key test failed: ${msg}`);
    }
  }

  async sendPage(pageeId, message) {
    if (!this.enabled) {
      return { success: false, reason: 'disabled' };
    }

    if (!pageeId) {
      return { success: false, reason: 'no_pagee_id' };
    }

    try {
      const data = await this._post('/page/send', {
        id: String(pageeId),
        message: message
      });

      // Log raw response so we can diagnose eventId extraction issues
      console.log(`[Pagem sendPage] pagee=${pageeId} raw response:`, JSON.stringify(data));

      // Pagem may double-encode the eventId inside data.data (same as testApiKey).
      // Extract it from both layers so _logPage always gets a real eventId.
      let eventId = data.eventId || null;
      if (!eventId && data.data) {
        try {
          const inner = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
          eventId = inner.eventId || inner.event_id || null;
        } catch (_) {}
      }

      // Normalise the return value so callers can always read result.eventId
      const result = { ...data, eventId };

      if (result.success) {
        console.log(`Page sent to pagee ${pageeId} - eventId: ${eventId}`);
      } else {
        console.warn(`Pagem returned success:false for pagee ${pageeId}:`, data);
      }

      return result;
    } catch (err) {
      const msg = err.response?.data?.errorMessage || err.response?.data?.message || err.message;
      console.error(`Failed to send page to pagee ${pageeId}:`, msg);
      return { success: false, reason: msg };
    }
  }

  async getPageStatus(eventId) {
    if (!this.enabled) throw new Error('Pagem API key not configured');

    try {
      const data = await this._post('/page/status', { eventId });
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      throw new Error(`Pagem status check failed: ${msg}`);
    }
  }

  // -- Page logging -----------------------------------------------------------

  /**
   * Write a row to pagem_page_log after a page is sent.
   * Called internally after sendPage — do not call externally.
   */
  async _logPage({ vesselId, alertId, alertType, supervisorName, pageeId, message, eventId, success }) {
    try {
      await prisma.pagem_page_log.create({
        data: {
          vessel_id: vesselId || null,
          alert_id: alertId || null,
          alert_type: alertType || 'individual',
          supervisor_name: supervisorName || null,
          pagee_id: String(pageeId),
          message,
          event_id: eventId || null,
          status: success ? 'sent' : 'failed',
          sent_at: new Date()
        }
      });
    } catch (err) {
      // Logging failures should never crash the alert pipeline
      console.error('Failed to write pagem_page_log entry:', err.message);
    }
  }

  /**
   * Poll Pagem for the current delivery/acknowledgement status of a page
   * and update the pagem_page_log row.
   *
   * @param {number} logId   - pagem_page_log.id
   * @param {string} eventId - Pagem eventId
   * @returns {Promise<object|null>} Updated log row
   */
  /**
   * @param {number}       logId
   * @param {string}       eventId
   * @param {object|null}  preloaded - Pass an already-fetched Pagem response to
   *                                   avoid a second API call (respects throttle).
   */
  async pollAndUpdateStatus(logId, eventId, preloaded = null) {
    if (!eventId) return null;

    let pagemData = preloaded;
    if (!pagemData) {
      try {
        pagemData = await this._post('/page/status', { eventId });
      } catch (err) {
        console.warn(`Status poll failed for eventId ${eventId}:`, err.message);
        return null;
      }
    }

    // Pagem returns: { success: true, data: "<JSON string>" }
    // The inner JSON has a `messages` array — acknowledgement is a message entry
    // with type "ALERT_ACKNOWLEDGEMENT", not a top-level status field.
    let inner = null;
    try {
      inner = typeof pagemData.data === 'string'
        ? JSON.parse(pagemData.data)
        : pagemData.data;
    } catch (_) {
      inner = pagemData; // fallback if not double-encoded
    }

    const messages = Array.isArray(inner?.messages) ? inner.messages : [];

    // Find acknowledgement — type "ALERT_ACKNOWLEDGEMENT"
    const ackMsg = messages.find(m => m.type === 'ALERT_ACKNOWLEDGEMENT');

    // Device received the page if we see ALERT:RECEIVED or HANDSHAKE
    const receivedMsg = messages.find(m =>
      (m.type === 'ALERT' && m.status === 'RECEIVED') || m.type === 'HANDSHAKE'
    );

    let status = 'sent';
    let acknowledgedAt = null;

    if (ackMsg) {
      status = 'acknowledged';
      acknowledgedAt = ackMsg.timeUTC ? new Date(ackMsg.timeUTC) : new Date();
    } else if (receivedMsg) {
      status = 'delivered';
    }
    // If messages array is empty or none of the above match, keep 'sent'

    console.log(`[Pagem status] eventId=${eventId} messages=${messages.length} ackMsg=${!!ackMsg} → status="${status}" acknowledged_at=${acknowledgedAt}`);

    const updated = await prisma.pagem_page_log.update({
      where: { id: logId },
      data: {
        status,
        acknowledged_at: acknowledgedAt,
        last_checked_at: new Date()
      }
    });

    console.log(`[Pagem status] logId=${logId} → DB updated: status="${updated.status}" acknowledged_at=${updated.acknowledged_at}`);
    return updated;
  }

  // -- Background status poller -----------------------------------------------

  /**
   * Start a background timer that polls Pagem every 30 seconds for
   * status updates on pages that are not yet acknowledged or failed.
   * Stops automatically when there is nothing left to poll.
   */
  startStatusPoller() {
    if (this._pollerTimer) return; // already running

    const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds
    const PAGEM_THROTTLE_MS = 5100;     // Pagem throttles to 1 req/5s

    const poll = async () => {
      if (!this.enabled) return;

      try {
        // Only poll pages sent in the last 24 hours that are not yet terminal
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const pending = await prisma.pagem_page_log.findMany({
          where: {
            sent_at: { gte: since },
            event_id: { not: null },
            status: { in: ['sent', 'delivered'] }
          },
          orderBy: { sent_at: 'asc' },
          take: 20 // cap per cycle to stay within throttle
        });

        for (const row of pending) {
          await this.pollAndUpdateStatus(row.id, row.event_id);
          // Respect Pagem's 1 req/5s throttle
          await sleep(PAGEM_THROTTLE_MS);
        }
      } catch (err) {
        console.error('Page status poller error:', err.message);
      }
    };

    this._pollerTimer = setInterval(poll, POLL_INTERVAL_MS);
    console.log('Pagem status poller started (30s interval)');
  }

  stopStatusPoller() {
    if (this._pollerTimer) {
      clearInterval(this._pollerTimer);
      this._pollerTimer = null;
      console.log('Pagem status poller stopped');
    }
  }

  // -- High-level helpers used by the alert system ----------------------------

  /**
   * Send an alert page to all supervisors assigned to a vessel and log each one.
   *
   * If the vessel has no supervisors assigned (or none have a pager_id set),
   * falls back to paging ALL admins and supervisors in the system who have
   * a pager_id — so a page always goes out rather than silently dropping.
   *
   * @param {number}  vesselId
   * @param {string}  message
   * @param {object}  opts
   * @param {number}  [opts.alertId]
   * @param {string}  [opts.alertType]
   * @param {boolean} [opts.fallbackToAll=true]  Set false to disable global fallback
   */
  async notifyVesselSupervisors(vesselId, message, { alertId, alertType, fallbackToAll = true } = {}) {
    if (!this.enabled) return [];

    const vessel = await prisma.vessels.findUnique({
      where: { id: vesselId },
      include: {
        users_vessels_primary_supervisor_idTousers: {
          select: { id: true, username: true, pager_id: true }
        },
        users_vessels_secondary_supervisor_idTousers: {
          select: { id: true, username: true, pager_id: true }
        }
      }
    });

    if (!vessel) {
      console.warn(`notifyVesselSupervisors: vessel ${vesselId} not found`);
      return [];
    }

    const supervisors = [];
    const seen = new Set();

    for (const sup of [
      vessel.users_vessels_primary_supervisor_idTousers,
      vessel.users_vessels_secondary_supervisor_idTousers
    ]) {
      if (sup && sup.pager_id && !seen.has(sup.id)) {
        seen.add(sup.id);
        supervisors.push(sup);
      }
    }

    // No vessel-assigned supervisors with pager IDs — fall back to all users
    // with a pager_id so the page never silently drops.
    if (supervisors.length === 0) {
      if (!fallbackToAll) {
        console.log(`No supervisors with pager_id for vessel "${vessel.name}" - no pages sent`);
        return [];
      }

      console.warn(`No supervisors assigned to vessel "${vessel.name}" — falling back to all users with a pager_id`);

      const allPaged = await prisma.users.findMany({
        where: {
          pager_id: { not: null },
          role: { in: ['admin', 'supervisor'] }
        },
        select: { id: true, username: true, pager_id: true }
      });

      for (const u of allPaged) {
        if (u.pager_id && !seen.has(u.id)) {
          seen.add(u.id);
          supervisors.push(u);
        }
      }

      if (supervisors.length === 0) {
        console.warn('No users with a pager_id found system-wide - no pages sent');
        return [];
      }
    }

    console.log(`Paging ${supervisors.length} supervisor(s) for vessel "${vessel.name}"`);

    const results = [];
    for (const sup of supervisors) {
      const result = await this.sendPage(sup.pager_id, message);

      // Log every attempt (success or failure)
      await this._logPage({
        vesselId,
        alertId: alertId || null,
        alertType: alertType || 'individual',
        supervisorName: sup.username,
        pageeId: sup.pager_id,
        message,
        eventId: result.eventId || null,
        success: result.success
      });

      results.push({ supervisor: sup.username, pageeId: sup.pager_id, result });
    }

    return results;
  }
}

module.exports = new PagemService();