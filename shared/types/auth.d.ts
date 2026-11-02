declare module "#auth-utils" {
  interface User {
    // OIDC `sub`, stored as sources.user_id
    id: string;
    name?: string;
    email?: string;
  }

  interface UserSession {}

  interface SecureSessionData {}
}

export {};
