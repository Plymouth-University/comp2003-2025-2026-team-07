const axios = require('axios');
const { prisma } = require('../config/database');

/**
 * Pager Service - Sends notifications via Pagem API
 *
 * API base: https://www.pagem.com/api/v2/
 * Auth:     custom header  authentication: <api-key>
 * Send:     POST /page/send  body: id=<pagee_api_id>&message=<text>
 *
 * Each supervisor's Pagem "Pagee API ID" is stored in users.pager_id.
 * Vessels link to primary_supervisor_id and secondary_supervisor_id.
 */
class PagerService {
  constructor() {
    this.apiKey = process.env.PAGE_AUTH_TOKEN || '';
    this.baseURL = 'https://www.pagem.com/api/v2';
    this.timeout = 10000;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'authentication': this.apiKey
      }
    });
  }

  /**
   * Test API key validity against Pagem
   * @returns {Promise<Object>} { success, data|error }
   */
  async testApiKey() {
    try {
      const response = await this.client.post('/test/apiKey');
      console.log('✅ Pagem API key is valid');
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`❌ Pagem API key test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a page to a single recipient
   * @param {string} pagerId  - Recipient's Pagee API ID (users.pager_id)
   * @param {string} message  - Message text (keep under ~160 chars)
   * @returns {Promise<Object>} { success, eventId|error }
   */
  async sendPage(pagerId, message) {
    try {
      const body = new URLSearchParams();
      body.append('id', pagerId);
      body.append('message', message);

      const response = await this.client.post('/page/send', body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (response.data && response.data.success) {
        console.log(`📟 Pagem sent to pagerId ${pagerId}. EventId: ${response.data.eventId}`);
        return { success: true, eventId: response.data.eventId };
      }

      console.error(`❌ Pagem returned success:false for pagerId ${pagerId}:`, response.data);
      return { success: false, error: 'Pagem returned success:false' };
    } catch (error) {
      console.error(`❌ Error sending Pagem to pagerId ${pagerId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send an alert notification to a vessel's responsible supervisor.
   * - Tries primary supervisor first.
   * - Falls back to secondary supervisor if primary has no pager_id or send fails.
   * - Updates alert_history.pagem_sent / pagem_sent_at on success.
   * - Never throws — notification failure must not block alert creation.
   *
   * @param {Object} alertHistory - alert_history record from Prisma
   * @param {Object} vessel       - vessels record (must include .id and .name)
   */
  async sendAlert(alertHistory, vessel) {
    try {
      if (!this.apiKey) {
        console.warn('⚠️  PAGE_AUTH_TOKEN not set — skipping Pagem notification');
        return;
      }

      // Fetch vessel with both supervisor relations
      const vesselWithSupervisors = await prisma.vessels.findUnique({
        where: { id: vessel.id },
        include: {
          users_vessels_primary_supervisor_idTousers: true,
          users_vessels_secondary_supervisor_idTousers: true
        }
      });

      if (!vesselWithSupervisors) {
        console.warn(`⚠️  Vessel ${vessel.id} not found — skipping Pagem notification`);
        return;
      }

      const primary = vesselWithSupervisors.users_vessels_primary_supervisor_idTousers;
      const secondary = vesselWithSupervisors.users_vessels_secondary_supervisor_idTousers;

      // Build a concise alert message (Pagem recommends short messages)
      const message = `OSHEN ALERT [${vessel.name}]: ${alertHistory.alert_text}`;

      let sent = false;
      let eventId = null;

      // Try primary supervisor
      if (primary && primary.pager_id) {
        const result = await this.sendPage(primary.pager_id, message);
        if (result.success) {
          sent = true;
          eventId = result.eventId;
          console.log(`📟 Pagem alert delivered to primary supervisor "${primary.username}" for vessel ${vessel.name}`);
        } else {
          console.warn(`⚠️  Pagem failed for primary supervisor "${primary.username}", escalating to secondary...`);
        }
      } else {
        console.warn(`⚠️  Primary supervisor has no pager_id for vessel ${vessel.name} — escalating to secondary...`);
      }

      // Escalate to secondary supervisor if primary failed or has no pager_id
      if (!sent) {
        if (secondary && secondary.pager_id) {
          const result = await this.sendPage(secondary.pager_id, message);
          if (result.success) {
            sent = true;
            eventId = result.eventId;
            console.log(`📟 Pagem alert delivered to secondary supervisor "${secondary.username}" for vessel ${vessel.name}`);
          } else {
            console.warn(`⚠️  Pagem also failed for secondary supervisor "${secondary.username}"`);
          }
        } else {
          console.warn(`⚠️  No secondary supervisor pager_id found for vessel ${vessel.name}`);
        }
      }

      if (!sent) {
        console.warn(`⚠️  Pagem notification NOT sent for alert #${alertHistory.id} — no valid pager IDs or all sends failed`);
        return;
      }

      // Mark the alert as pagem_sent in the database with eventId
      await prisma.alert_history.update({
        where: { id: alertHistory.id },
        data: {
          pagem_sent: true,
          pagem_sent_at: new Date(),
          pagem_event_id: eventId
        }
      });

      console.log(`✅ Alert #${alertHistory.id} marked pagem_sent in database with eventId: ${eventId}`);
    } catch (error) {
      // Swallow all errors — notification failures must not block alert creation
      console.error(`❌ Unexpected error in pagerService.sendAlert for alert #${alertHistory.id}: ${error.message}`);
    }
  }
}

module.exports = new PagerService();
