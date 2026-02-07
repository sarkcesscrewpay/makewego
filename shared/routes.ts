import { z } from 'zod';
import { insertBusSchema, insertRouteSchema, insertScheduleSchema, insertBookingSchema, buses, busRoutes, schedules, bookings, profiles } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  // === BUSES ===
  buses: {
    list: {
      method: 'GET' as const,
      path: '/api/buses',
      responses: {
        200: z.array(z.custom<typeof buses.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/buses',
      input: insertBusSchema,
      responses: {
        201: z.custom<typeof buses.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/buses/:id',
      input: insertBusSchema.partial(),
      responses: {
        200: z.custom<typeof buses.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === ROUTES ===
  routes: {
    list: {
      method: 'GET' as const,
      path: '/api/routes',
      responses: {
        200: z.array(z.custom<typeof busRoutes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/routes',
      input: insertRouteSchema,
      responses: {
        201: z.custom<typeof busRoutes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // === SCHEDULES ===
  schedules: {
    list: {
      method: 'GET' as const,
      path: '/api/schedules',
      input: z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        date: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof schedules.$inferSelect & { route: typeof busRoutes.$inferSelect, bus: typeof buses.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/schedules',
      input: insertScheduleSchema,
      responses: {
        201: z.custom<typeof schedules.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // === BOOKINGS ===
  bookings: {
    list: {
      method: 'GET' as const,
      path: '/api/bookings',
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect & { schedule: typeof schedules.$inferSelect, route: typeof busRoutes.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookings',
      input: insertBookingSchema,
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    cancel: {
      method: 'POST' as const,
      path: '/api/bookings/:id/cancel',
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === USER PROFILE ===
  profile: {
    get: {
      method: 'GET' as const,
      path: '/api/profile',
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/profile',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
