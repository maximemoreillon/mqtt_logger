<script setup lang="ts">
const { loggedIn } = useUserSession();
</script>

<template>
  <UButton
    v-if="loggedIn"
    to="/login"
    icon="i-lucide-user"
    color="neutral"
    variant="ghost"
    aria-label="Account"
  />
</template>
