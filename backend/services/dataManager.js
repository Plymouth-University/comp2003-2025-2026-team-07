import prisma from "../config/database.js";

class DataManager {
  async getPlatforms() {
    return prisma.platform.findMany({
      include: {
        message_types: {
          include: {
            alert_triggers: true,
          },
        },
      },
    });
  }

  async updateHeatmapDisplay(platformId, msgTypeId, rawValues, triggerStatus, timestamps) {
    return prisma.message_type.update({
      where: { id: msgTypeId },
      data: {
        last_N_message_timestrings: timestamps,
        alert_triggers: {
          updateMany: rawValues.map((row, i) => ({
            where: { id: row.triggerId },
            data: {
              last_N_message_values: row,
              last_N_message_triggered_status: triggerStatus[i],
            }
          }))
        }
      }
    });
  }
}

export default new DataManager();
