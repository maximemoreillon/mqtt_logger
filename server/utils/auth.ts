import type { H3Event } from "h3";
import { createRemoteJWKSet, jwtVerify } from "jose";

export const authEnabled = (event?: H3Event) =>
  Boolean(useRuntimeConfig(event).oauth.oidc.clientId);

// Provider metadata, fetched once (a failed fetch is retried next time)
let discovery: Promise<{ issuer: string; jwks_uri: string }> | null = null;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

// Verifies a bearer JWT from the OIDC provider (signature against its JWKS,
// expiry, issuer, optional audience) and returns its `sub`.
export const verifyBearerToken = async (event: H3Event, token: string) => {
  const config = useRuntimeConfig(event);
  discovery ??= $fetch<{ issuer: string; jwks_uri: string }>(
    config.oauth.oidc.openidConfig,
  ).catch((error) => {
    discovery = null;
    throw error;
  });
  const { issuer, jwks_uri } = await discovery;
  jwks ??= createRemoteJWKSet(new URL(jwks_uri));
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: config.oidcAudience || undefined,
  });
  if (!payload.sub) throw new Error("Token has no sub claim");
  return payload.sub;
};
