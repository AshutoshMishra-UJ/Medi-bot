import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@medibot/db';
import { config } from '@medibot/config';
import { RegisterSchema, LoginSchema, ConsentSchema } from '@medibot/types';
import { authMiddleware } from '../middleware/auth';

export const authRouter = Router();

// ─── POST /auth/register ──────────────────────────────────────────────────────
authRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data:   { email, passwordHash },
      select: { userId: true, email: true, createdAt: true },
    });

    return res.status(201).json({ userId: user.userId, email: user.email });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn } as jwt.SignOptions,
    );

    return res.json({ token, expiresIn: config.auth.jwtExpiresIn, userId: user.userId });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /auth/consent (requires auth) ──────────────────────────────────────
authRouter.post('/consent', authMiddleware, async (req: Request, res: Response) => {
  const parsed = ConsentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { scope, granted } = parsed.data;
  const userId = (req as any).user?.userId;

  try {
    // Upsert — if consent exists, update it; otherwise create
    const existing = await prisma.consent.findFirst({ where: { userId, scope } });

    let consent;
    if (existing) {
      consent = await prisma.consent.update({
        where: { consentId: existing.consentId },
        data: {
          granted,
          grantedAt: granted ? new Date() : existing.grantedAt,
          revokedAt: !granted ? new Date() : null,
        },
      });
    } else {
      consent = await prisma.consent.create({
        data: {
          userId,
          scope,
          granted,
          grantedAt: granted ? new Date() : null,
        },
      });
    }

    return res.json({ consentId: consent.consentId, scope, granted });
  } catch (err) {
    console.error('[consent]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /auth/me (requires auth) ─────────────────────────────────────────────
authRouter.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  try {
    const user = await prisma.user.findUnique({
      where:  { userId },
      select: { userId: true, email: true, status: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
