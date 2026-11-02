import pkg from "../../package.json";
import { pool } from "../db";
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

export default defineEventHandler(async (event) => ({
  application_name: "MQTT Logger",
  version: pkg.version,
  ready: startup.ready,
  error: startup.error,
  database: { connected: await databaseConnected() },
  mqtt: { url: useRuntimeConfig(event).mqtt.url, connected: mqttConnected() },
}));
