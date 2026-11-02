<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession();
</script>

<template>
  <UCard class="mx-auto mt-8 max-w-sm">
    <template v-if="loggedIn">
      <p class="mb-4">Logged in as {{ user?.name ?? user?.id }}</p>
      <UButton
        label="Log out"
        icon="i-lucide-log-out"
        block
        @click="clear"
      />
    </template>
    <template v-else>
      <p class="mb-4">Please log in to proceed</p>
      <UButton
        label="Log in"
        icon="i-lucide-log-in"
        to="/auth/oidc"
        external
        block
      />
    </template>
  </UCard>
</template>
