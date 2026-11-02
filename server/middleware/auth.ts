// Authenticates /api/* requests and puts the caller on event.context.user:
// a bearer JWT from the OIDC provider (scripts), else the session (GUI).
// GET /api (status) stays public. Without OIDC settings, auth is off.
import { decodePath } from "ufo";

export default defineEventHandler(async (event) => {
  // Decode like the router does: /%61pi/sources is routed to /api/sources,
  // so checking the raw path would let it bypass auth.
  const path = decodePath(getRequestURL(event).pathname);
  if (!path.startsWith("/api/") || path.startsWith("/api/_auth/")) return;
  if (!authEnabled(event)) return;

  const authorization = getHeader(event, "authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    try {
      const sub = await verifyBearerToken(event, authorization.slice(7).trim());
      event.context.user = { id: sub };
      return;
    } catch (error) {
      console.warn(`[Auth] Invalid bearer token: ${(error as Error).message}`);
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }
  }

  const { user } = await requireUserSession(event);
  event.context.user = user;
});

declare module "h3" {
  interface H3EventContext {
    // Unset when auth is disabled
    user?: import("#auth-utils").User;
  }
}
