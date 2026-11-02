<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { z } from "zod";
import { createSourceSchema, type SourceInput } from "#shared/source";

const props = defineProps<{
  initial?: Partial<SourceInput>;
  submitLabel?: string;
  loading?: boolean;
}>();

const emit = defineEmits<{ submit: [source: SourceInput] }>();

// Tags are edited as rows and converted to an object on submit
const schema = createSourceSchema.omit({ tags: true });

const state = reactive({
  name: props.initial?.name ?? "",
  description: props.initial?.description ?? "",
  topic: props.initial?.topic ?? "",
  keys: [...(props.initial?.keys ?? [])],
});

const tags = ref(
  Object.entries(props.initial?.tags ?? {}).map(([key, value]) => ({ key, value })),
);
const addTag = () => tags.value.push({ key: "", value: "" });
const removeTag = (index: number) => tags.value.splice(index, 1);

const tagsError = computed(() => {
  const keys = tags.value.map((t) => t.key.trim()).filter(Boolean);
  if (new Set(keys).size !== keys.length) return "Tag keys must be unique";
  return undefined;
});

const onSubmit = (event: FormSubmitEvent<z.output<typeof schema>>) => {
  if (tagsError.value) return;
  emit("submit", {
    ...event.data,
    tags: Object.fromEntries(
      tags.value
        .filter((t) => t.key.trim())
        .map((t) => [t.key.trim(), t.value]),
    ),
  });
};
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
    <UFormField label="Name" name="name" required>
      <UInput v-model="state.name" class="w-full" />
    </UFormField>

    <UFormField label="Description" name="description">
      <UTextarea v-model="state.description" :rows="2" class="w-full" />
    </UFormField>

    <UFormField
      label="Topic"
      name="topic"
      required
      help="MQTT topic filter. Wildcards are allowed, e.g. home/+/temperature or sensors/#"
    >
      <UInput v-model="state.topic" placeholder="home/livingroom" class="w-full font-mono" />
    </UFormField>

    <UFormField
      label="Fields"
      name="keys"
      help="Payload fields to log, nested ones with dots (e.g. ENERGY.Power). Leave empty to log every numeric field."
    >
      <UInputTags v-model="state.keys" placeholder="Add a field" class="w-full" />
    </UFormField>

    <UFormField label="Tags" :error="tagsError">
      <div class="space-y-2">
        <div v-for="(tag, index) in tags" :key="index" class="flex gap-2">
          <UInput v-model="tag.key" placeholder="Key" class="flex-1" />
          <UInput v-model="tag.value" placeholder="Value" class="flex-1" />
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            aria-label="Remove tag"
            @click="removeTag(index)"
          />
        </div>
        <UButton
          icon="i-lucide-plus"
          label="Add tag"
          color="neutral"
          variant="outline"
          size="sm"
          @click="addTag"
        />
      </div>
    </UFormField>

    <div class="flex justify-end gap-2">
      <slot name="actions" />
      <UButton type="submit" :label="submitLabel ?? 'Save'" :loading="loading" />
    </div>
  </UForm>
</template>
