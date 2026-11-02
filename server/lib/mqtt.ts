import mqtt, { type MqttClient } from "mqtt";
import { db } from "../db";
import { sources as sourcesTable, type Source } from "../db/schema";
import { config } from "./config";
import { extractValues, topicMatches } from "./ingest";
import { enqueue } from "./writer";

// Other replicas may change sources: reload periodically as a safety net.
// (Postgres LISTEN/NOTIFY would make this instant if ever needed.)
const RELOAD_INTERVAL_MS = 30_000;

let client: MqttClient | null = null;
let sources: Pick<Source, "id" | "topic" | "keys">[] = [];
const subscribed = new Set<string>();
let reloadTimer: NodeJS.Timeout | null = null;

const subscriptionTopic = (filter: string) =>
  config.MQTT_SHARED_GROUP
    ? `$share/${config.MQTT_SHARED_GROUP}/${filter}`
    : filter;

// Subscribes / unsubscribes so that exactly the topics of current sources are
// subscribed. Several sources may share a topic.
const syncSubscriptions = () => {
  if (!client?.connected) return;
  const wanted = new Set(sources.map((s) => s.topic));

  for (const topic of subscribed) {
    if (wanted.has(topic)) continue;
    client.unsubscribe(subscriptionTopic(topic));
    subscribed.delete(topic);
    console.log(`[MQTT] Unsubscribed from ${topic}`);
  }
  for (const topic of wanted) {
    if (subscribed.has(topic)) continue;
    client.subscribe(subscriptionTopic(topic), { qos: 1 }, (error) => {
      if (error) {
        console.error(`[MQTT] Failed to subscribe to ${topic}`, error);
        subscribed.delete(topic);
      }
    });
    subscribed.add(topic);
    console.log(`[MQTT] Subscribed to ${topic}`);
  }
};

// Call after any change to sources
export const reloadSources = async () => {
  sources = await db
    .select({
      id: sourcesTable.id,
      topic: sourcesTable.topic,
      keys: sourcesTable.keys,
    })
    .from(sourcesTable);
  syncSubscriptions();
};

const onMessage = (topic: string, payload: Buffer) => {
  const matching = sources.filter((s) => topicMatches(s.topic, topic));
  if (!matching.length) return;

  const time = new Date();
  const message = payload.toString();

  for (const source of matching) {
    const values = extractValues(message, source.keys);
    enqueue(values.map((v) => ({ time, sourceId: source.id, ...v })));
  }
};

export const startMqtt = async () => {
  await reloadSources();

  console.log(`[MQTT] Connecting to ${config.MQTT_URL}...`);
  client = mqtt.connect(config.MQTT_URL, {
    username: config.MQTT_USERNAME,
    password: config.MQTT_PASSWORD,
    reconnectPeriod: 5000,
    // Subscriptions are restored by syncSubscriptions() on connect
    resubscribe: false,
  });

  client.on("connect", () => {
    console.log(`[MQTT] Connected to ${config.MQTT_URL}`);
    // On a fresh session the broker forgot our subscriptions
    subscribed.clear();
    syncSubscriptions();
  });
  client.on("error", (error) => console.error("[MQTT] Error:", error.message));
  client.on("message", onMessage);

  reloadTimer ??= setInterval(
    () =>
      reloadSources().catch((error) =>
        console.error("[MQTT] Failed to reload sources", error),
      ),
    RELOAD_INTERVAL_MS,
  );
};

export const stopMqtt = async () => {
  if (reloadTimer) clearInterval(reloadTimer);
  reloadTimer = null;
  await client?.endAsync();
  client = null;
};

export const mqttConnected = () => client?.connected ?? false;
