<script setup lang="ts">
// Database / MQTT connection state, polled from GET /api
const { data: status, refresh } = await useFetch("/api");

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => (timer = setInterval(refresh, 15_000)));
onBeforeUnmount(() => clearInterval(timer));

const items = computed(() =>
  status.value
    ? [
        { label: "Database", ok: status.value.database.connected },
        {
          label: "MQTT",
          ok: status.value.mqtt.connected,
          detail: status.value.mqtt.url,
        },
      ]
    : [],
);
</script>

<template>
  <div class="flex items-center gap-2">
    <UTooltip v-if="status?.error" :text="status.error">
      <UIcon name="i-lucide-triangle-alert" class="size-5 text-error" />
    </UTooltip>
    <UTooltip
      v-for="item in items"
      :key="item.label"
      :text="`${item.detail ?? item.label}: ${item.ok ? 'connected' : 'disconnected'}`"
    >
      <UBadge
        :color="item.ok ? 'success' : 'error'"
        variant="subtle"
        :icon="item.ok ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
        :label="item.label"
      />
    </UTooltip>
  </div>
</template>
