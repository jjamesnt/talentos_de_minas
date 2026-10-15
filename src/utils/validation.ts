import { z } from 'zod';

/**
 * Utilitário genérico para validar dados com schemas Zod
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return { success: false, errors: errorMessages };
  }
  return { success: true, data: result.data };
}
