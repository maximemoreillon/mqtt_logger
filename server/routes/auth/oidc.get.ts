export default defineOAuthOidcEventHandler({
  config: {
    scope: ["openid", "profile", "email"],
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        id: user.sub,
        name: user.name ?? user.preferred_username ?? user.email,
        email: user.email,
      },
    });
    return sendRedirect(event, "/");
  },
  onError(event, error) {
    console.error("OIDC error:", error);
    return sendRedirect(event, "/login");
  },
});
