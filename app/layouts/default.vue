<template>
  <div>
    <UHeader title="MQTT Logger" to="/" :toggle="false">
      <template #right>
        <StatusIndicator />
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <UContainer class="py-6">
        <slot />
      </UContainer>
    </UMain>
  </div>
</template>
