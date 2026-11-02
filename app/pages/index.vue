<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

const PAGE_SIZE = 20;

const search = ref("");
const debouncedSearch = ref("");
const page = ref(1);

let debounce: ReturnType<typeof setTimeout> | undefined;
watch(search, (value) => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    debouncedSearch.value = value;
    page.value = 1;
  }, 300);
});

const { data, status } = await useFetch("/api/sources", {
  query: computed(() => ({
    search: debouncedSearch.value || undefined,
    limit: PAGE_SIZE,
    offset: (page.value - 1) * PAGE_SIZE,
  })),
});

type Row = NonNullable<typeof data.value>["items"][number];

const columns: TableColumn<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "topic", header: "Topic" },
  { accessorKey: "keys", header: "Fields" },
  { accessorKey: "createdAt", header: "Created" },
];
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">Sources</h1>
      <UButton icon="i-lucide-plus" label="New source" to="/sources/new" />
    </div>

    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Search by name or topic"
      class="w-full sm:max-w-sm"
    />

    <UTable
      :data="data?.items ?? []"
      :columns="columns"
      :loading="status === 'pending'"
      empty="No sources yet"
    >
      <template #name-cell="{ row }">
        <ULink :to="`/sources/${row.original.id}`" class="font-medium text-primary">
          {{ row.original.name }}
        </ULink>
      </template>
      <template #topic-cell="{ row }">
        <code class="text-sm">{{ row.original.topic }}</code>
      </template>
      <template #keys-cell="{ row }">
        <span class="text-muted">
          {{ row.original.keys.length ? row.original.keys.join(", ") : "All" }}
        </span>
      </template>
      <template #createdAt-cell="{ row }">
        {{ new Date(row.original.createdAt).toLocaleDateString() }}
      </template>
    </UTable>

    <div v-if="(data?.total ?? 0) > PAGE_SIZE" class="flex justify-center">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="PAGE_SIZE" />
    </div>
  </div>
</template>
