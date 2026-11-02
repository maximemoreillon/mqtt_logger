export default defineNuxtRouteMiddleware((to) => {
  if (to.path === "/login" || to.path.startsWith("/auth")) return;

  // The OIDC settings are server-only: read them during SSR and hand the
  // result to the client through the payload.
  const authEnabled = useState("auth-enabled", () =>
    Boolean(useRuntimeConfig().oauth?.oidc?.clientId),
  );
  if (!authEnabled.value) return;

  const { loggedIn } = useUserSession();
  if (!loggedIn.value) return navigateTo("/login");
});
