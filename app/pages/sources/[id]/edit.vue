<script setup lang="ts">
import type { SourceInput } from "#shared/source";

const route = useRoute();
const id = route.params.id as string;
const toast = useToast();
const saving = ref(false);

const { data: source, error } = await useFetch(`/api/sources/${id}`);
if (error.value) throw createError({ statusCode: 404, statusMessage: "Source not found", fatal: true });

const update = async (body: SourceInput) => {
  saving.value = true;
  try {
    await $fetch(`/api/sources/${id}`, { method: "PATCH", body });
    toast.add({ title: "Source updated", color: "success" });
    await navigateTo(`/sources/${id}`);
  } catch (error) {
    toast.add({ title: "Could not update source", description: errorMessage(error), color: "error" });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div v-if="source" class="mx-auto max-w-2xl space-y-6">
    <h1 class="text-2xl font-semibold">Edit {{ source.name }}</h1>
    <UCard>
      <SourceForm :initial="source" :loading="saving" @submit="update">
        <template #actions>
          <UButton label="Cancel" color="neutral" variant="ghost" :to="`/sources/${id}`" />
        </template>
      </SourceForm>
    </UCard>
  </div>
</template>
