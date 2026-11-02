import pkg from "../../package.json";
import { pool } from "../db";
import { config } from "../lib/config";
import { mqttConnected } from "../lib/mqtt";
import { startup } from "../lib/startup";

const databaseConnected = async () => {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
};

export default defineEventHandler(async () => ({
  application_name: "MQTT Logger",
  version: pkg.version,
  ready: startup.ready,
  error: startup.error,
  database: { connected: await databaseConnected() },
  mqtt: { url: config.MQTT_URL, connected: mqttConnected() },
}));
