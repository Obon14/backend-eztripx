
export const AuthThrottle = {
  register: { default: { limit: 5, ttl: 900_000 } },
  login: { default: { limit: 10, ttl: 60_000 } },
  refresh: { default: { limit: 30, ttl: 60_000 } },
  authenticated: { default: { limit: 60, ttl: 60_000 } },
} as const;
