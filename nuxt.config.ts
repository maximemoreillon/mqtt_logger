// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "nuxt-auth-utils"],
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      title: "MQTT Logger",
      link: [
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      ],
    },
  },
  // Set at runtime by NUXT_* variables, e.g. mqtt.url <- NUXT_MQTT_URL.
  // Validated in server/lib/config.ts. DATABASE_URL is the exception: a plain
  // env var, because drizzle-kit needs it too.
  runtimeConfig: {
    migrationsDir: "server/db/migrations",
    mqtt: {
      url: "mqtt://localhost:1883",
      username: "",
      password: "",
      // $share/<group>/... subscriptions, required when running replicas
      sharedGroup: "",
    },
    timescale: {
      mode: "auto", // auto | true | false
      // Postgres intervals, e.g. "7 days". Empty = no policy.
      compressAfter: "",
      retention: "",
    },
    // Auth (nuxt-auth-utils): disabled while NUXT_OAUTH_OIDC_CLIENT_ID is empty
    oauth: {
      oidc: {
        clientId: "",
        clientSecret: "",
        // e.g. https://auth.example.com/.well-known/openid-configuration
        openidConfig: "",
        // Override when the callback URL can't be inferred (proxies, tunnels)
        redirectURL: "",
      },
    },
    // Without maxAge the sealed cookie never expires, even server-side
    session: { password: "", maxAge: 60 * 60 * 24 * 7 }, // 1 week
    // Required "aud" of bearer tokens (NUXT_OIDC_AUDIENCE). Empty = not checked.
    oidcAudience: "",
  },
});
