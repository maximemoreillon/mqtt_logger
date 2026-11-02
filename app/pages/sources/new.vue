<script setup lang="ts">
import type { SourceInput } from "#shared/source";

const toast = useToast();
const saving = ref(false);

const create = async (body: SourceInput) => {
  saving.value = true;
  try {
    const source = await $fetch("/api/sources", { method: "POST", body });
    toast.add({ title: `Source "${source.name}" created`, color: "success" });
    await navigateTo(`/sources/${source.id}`);
  } catch (error) {
    toast.add({ title: "Could not create source", description: errorMessage(error), color: "error" });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <h1 class="text-2xl font-semibold">New source</h1>
    <UCard>
      <SourceForm submit-label="Create" :loading="saving" @submit="create">
        <template #actions>
          <UButton label="Cancel" color="neutral" variant="ghost" to="/" />
        </template>
      </SourceForm>
    </UCard>
  </div>
</template>
