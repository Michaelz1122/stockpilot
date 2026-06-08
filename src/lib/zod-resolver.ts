import type { Resolver } from 'react-hook-form';
import type { ZodSchema } from 'zod';

// Tiny zod resolver to avoid adding @hookform/resolvers dependency.
export function zodResolver<T>(schema: ZodSchema<T>): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || '_root';
      if (!errors[path]) {
        errors[path] = { type: issue.code, message: issue.message };
      }
    }
    return { values: {} as T, errors: errors as any };
  };
}
