import { z } from 'zod';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  reels: {
    download: {
      method: 'POST' as const,
      path: '/api/reels/download' as const,
      input: z.object({
        url: z.string().url("Please enter a valid URL").regex(/instagram\.com/, "Must be a valid Instagram URL"),
      }),
      responses: {
        200: z.object({
          success: z.boolean(),
          videoUrl: z.string().optional(),
          message: z.string().optional(),
          error: z.string().optional(),
        }),
        400: errorSchemas.validation,
        500: errorSchemas.internal.extend({
          success: z.boolean().optional(),
          error: z.string().optional(),
        }),
      },
    },
  },
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
