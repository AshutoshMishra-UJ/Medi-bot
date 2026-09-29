import { Request, Response, NextFunction } from 'express';
import { prisma } from '@medibot/db';

export async function consentMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized — no user context' });
  }

  try {
    const consent = await prisma.consent.findFirst({
      where: {
        userId,
        scope:     'data_access',
        granted:   true,
        revokedAt: null,
      },
    });

    if (!consent) {
      return res.status(403).json({
        error:   'Consent required',
        message: 'Patient consent for data access has not been granted. POST /auth/consent to grant it.',
      });
    }

    next();
  } catch (err) {
    console.error('[consentMiddleware]', err);
    return res.status(500).json({ error: 'Internal server error during consent check' });
  }
}
