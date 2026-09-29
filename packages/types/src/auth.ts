import { z } from 'zod';

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const LoginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ConsentSchema = z.object({
  scope:   z.enum(['data_access', 'document_upload', 'wearable_sync', 'ai_processing']),
  granted: z.boolean(),
});

// ─── Auth Types ───────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput    = z.infer<typeof LoginSchema>;
export type ConsentInput  = z.infer<typeof ConsentSchema>;

export interface JwtPayload {
  userId: string;
  email:  string;
  iat?:   number;
  exp?:   number;
}

export interface AuthenticatedRequest {
  user: JwtPayload;
}
