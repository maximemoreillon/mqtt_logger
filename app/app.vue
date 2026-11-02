<script setup lang="ts">
// Placeholder until the GUI is ported from mqtt_logger_gui
const { data: status } = await useFetch("/api");
const { data: sources } = await useFetch("/api/sources");
</script>

<template>
  <main style="font-family: system-ui; max-width: 48rem; margin: 2rem auto; padding: 0 1rem">
    <h1>MQTT Logger <small v-if="status">v{{ status.version }}</small></h1>
    <template v-if="status">
      <p>
        Database:
        <strong>{{ status.database.connected ? "connected" : "disconnected" }}</strong>
      </p>
      <p>
        MQTT {{ status.mqtt.url }}:
        <strong>{{ status.mqtt.connected ? "connected" : "disconnected" }}</strong>
      </p>
      <p v-if="status.error" style="color: crimson">{{ status.error }}</p>
    </template>
    <h2>Sources ({{ sources?.total ?? 0 }})</h2>
    <ul>
      <li v-for="source in sources?.items" :key="source.id">
        <strong>{{ source.name }}</strong> — <code>{{ source.topic }}</code>
      </li>
    </ul>
  </main>
</template>
