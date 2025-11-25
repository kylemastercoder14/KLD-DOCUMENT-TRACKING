export const ROLE_CONFIG = {
  SYSTEM_ADMIN: {
    prefix: "/admin",
    dashboard: "/admin/dashboard",
  },
  PRESIDENT: {
    prefix: "/president",
    dashboard: "/president/dashboard",
  },
  VPAA: {
    prefix: "/vpaa",
    dashboard: "/vpaa/dashboard",
  },
  VPADA: {
    prefix: "/vpada",
    dashboard: "/vpada/dashboard",
  },
  DEAN: {
    prefix: "/dean",
    dashboard: "/dean/dashboard",
  },
  HR: {
    prefix: "/hr",
    dashboard: "/hr/dashboard",
  },
  INSTRUCTOR: {
    prefix: "/instructor",
    dashboard: "/instructor/dashboard",
  },
} as const;

export type UserRole = keyof typeof ROLE_CONFIG;
