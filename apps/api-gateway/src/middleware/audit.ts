import { Request, Response, NextFunction } from 'express';
import { prisma } from '@medibot/db';

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  // Wrap response.end to capture status code after response is sent
  const originalEnd = res.end.bind(res);

  (res as any).end = function (...args: any[]) {
    const userId = (req as any).user?.userId ?? null;

    // Fire-and-forget audit log — never block the response
    prisma.auditLog.create({
      data: {
        userId,
        action:     req.method,
        resource:   req.path,
        ipAddress:  req.ip ?? null,
        userAgent:  req.get('user-agent') ?? null,
        statusCode: res.statusCode,
      },
    }).catch((err: Error) => {
      // Log audit failures silently — never crash for audit
      console.error('[auditMiddleware] Failed to write audit log:', err.message);
    });

    return originalEnd(...args);
  };

  next();
}
