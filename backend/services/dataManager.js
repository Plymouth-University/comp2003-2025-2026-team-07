// backend/data_manager.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import lockfile from "proper-lockfile";
import { DATA_FILEPATH } from "./app_config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to resolve absolute path
const dataFile = path.resolve(__dirname, DATA_FILEPATH);

// -------------------- LOAD DATA --------------------
export async function loadData() {
    let release;
    try {
        release = await lockfile.lock(dataFile, { stale: 5000 });

        const json = fs.readFileSync(dataFile, "utf-8");
        return JSON.parse(json);

    } finally {
        if (release) await release();
    }
}

// -------------------- DUMMY CALC FUNCTION --------------------
export function calculateMessageTimePeriodToLoad(platform, message_type) {
    const min_time_horizon_mins = 60;
    const min_number_messages = 10;

    return { min_time_horizon_mins, min_number_messages };
}

// -------------------- UPDATE DATA (Safe RW) --------------------
export async function updateData(callback) {
    let release;

    try {
        release = await lockfile.lock(dataFile, { stale: 60000 });

        // Load existing JSON
        const json = fs.readFileSync(dataFile, "utf-8");
        const data = JSON.parse(json);

        // Modify in memory
        callback(data);

        // Write back
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 4));

    } finally {
        if (release) await release();
    }
}

// -------------------- UPDATE HEATMAP DISPLAY --------------------
export async function updateHeatmapDisplay(
    platform_index,
    message_type_index,
    raw_value_matrix,
    trigger_matrix,
    msg_timestamps
) {
    return updateData((data) => {
        data.last_updated = new Date().toISOString();

        const platform = data.platforms[platform_index];
        const msgType = platform.message_types[message_type_index];

        // Convert timestamps
        const isoTimestamps = msg_timestamps.map(ts =>
            ts instanceof Date ? ts.toISOString() : String(ts)
        );

        msgType.last_N_message_timestrings = isoTimestamps;

        // Update alert triggers
        msgType.alert_triggers.forEach((trigger, i) => {
            if (i < raw_value_matrix.length) {
                trigger.last_N_message_values = raw_value_matrix[i];
            }
            if (i < trigger_matrix.length) {
                trigger.last_N_message_triggered_status = trigger_matrix[i];
            }
        });
    });
}
