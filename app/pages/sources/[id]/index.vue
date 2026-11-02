<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;
const toast = useToast();

const { data: source, error } = await useFetch(`/api/sources/${id}`);
if (error.value) throw createError({ statusCode: 404, statusMessage: "Source not found", fatal: true });

const { data: fields } = await useFetch(`/api/sources/${id}/fields`, { default: () => [] });

// Time range: presets relative to "now", which moves forward on refresh
const HOUR = 60 * 60 * 1000;
const ranges = [
  { label: "1h", ms: HOUR },
  { label: "6h", ms: 6 * HOUR },
  { label: "24h", ms: 24 * HOUR },
  { label: "7d", ms: 7 * 24 * HOUR },
  { label: "30d", ms: 30 * 24 * HOUR },
];
const range = ref(ranges[2]!);
const end = ref(new Date());
const start = computed(() => new Date(end.value.getTime() - range.value.ms));
const selectedFields = ref<string[]>([]);

const {
  data: points,
  status,
  execute: loadPoints,
} = useFetch(`/api/sources/${id}/points`, {
  // Client only, started after mount: "now" differs between server and
  // browser, and a request pending during hydration would mismatch the UI.
  server: false,
  immediate: false,
  query: computed(() => ({
    start: start.value.toISOString(),
    end: end.value.toISOString(),
    fields: selectedFields.value.length ? selectedFields.value.join(",") : undefined,
  })),
});

const refresh = () => {
  end.value = new Date(); // triggers a refetch through the reactive query
};
const selectRange = (r: (typeof ranges)[number]) => {
  range.value = r;
  refresh();
};

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  loadPoints();
  timer = setInterval(refresh, 30_000);
});
onBeforeUnmount(() => clearInterval(timer));

// Deletion
const confirmDelete = ref(false);
const deleting = ref(false);
const remove = async () => {
  deleting.value = true;
  try {
    await $fetch(`/api/sources/${id}`, { method: "DELETE" });
    toast.add({ title: `Source "${source.value?.name}" deleted`, color: "success" });
    await navigateTo("/");
  } catch (error) {
    toast.add({ title: "Could not delete source", description: errorMessage(error), color: "error" });
  } finally {
    deleting.value = false;
    confirmDelete.value = false;
  }
};
</script>

<template>
  <div v-if="source" class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-1">
        <UButton
          icon="i-lucide-arrow-left"
          label="Sources"
          color="neutral"
          variant="link"
          to="/"
          class="px-0"
        />
        <h1 class="text-2xl font-semibold">{{ source.name }}</h1>
        <p v-if="source.description" class="text-muted">{{ source.description }}</p>
        <div class="flex flex-wrap items-center gap-2 pt-1">
          <code class="text-sm">{{ source.topic }}</code>
          <UBadge
            v-for="(value, key) in source.tags"
            :key="key"
            :label="`${key}: ${value}`"
            color="neutral"
            variant="subtle"
          />
        </div>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-lucide-pencil" label="Edit" color="neutral" variant="outline" :to="`/sources/${id}/edit`" />
        <UButton icon="i-lucide-trash-2" label="Delete" color="error" variant="soft" @click="confirmDelete = true" />
      </div>
    </div>

    <UCard>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <UFieldGroup>
          <UButton
            v-for="r in ranges"
            :key="r.label"
            :label="r.label"
            :color="r.label === range.label ? 'primary' : 'neutral'"
            :variant="r.label === range.label ? 'solid' : 'outline'"
            @click="selectRange(r)"
          />
        </UFieldGroup>
        <USelectMenu
          v-model="selectedFields"
          :items="fields ?? []"
          multiple
          placeholder="All fields"
          class="w-56"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          aria-label="Refresh"
          :loading="status === 'pending'"
          @click="refresh"
        />
      </div>

      <UEmpty
        v-if="status === 'success' && !points?.series.length"
        icon="i-lucide-chart-line"
        title="No data in this time range"
        :description="`Messages published to ${source.topic} will appear here.`"
      />
      <PointsChart
        v-else
        :series="points?.series ?? []"
        :start="start"
        :end="end"
        :loading="status === 'pending' && !points"
      />
    </UCard>

    <UModal v-model:open="confirmDelete" title="Delete source?">
      <template #body>
        <p>
          This permanently deletes <strong>{{ source.name }}</strong> and all its logged data.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="confirmDelete = false" />
          <UButton label="Delete" color="error" :loading="deleting" @click="remove" />
        </div>
      </template>
    </UModal>
  </div>
</template>
