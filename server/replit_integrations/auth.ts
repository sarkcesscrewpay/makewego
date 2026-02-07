// server/replit_integrations/auth.ts
import type { Express, Request, Response, NextFunction } from "express";

// Setup auth - no setup needed
export async function setupAuth(app: Express): Promise<void> {
  // No setup
}

// Register auth routes
export function registerAuthRoutes(app: Express): void {
  app.get('/api/auth/user', (req, res) => {
    // Return a mock user for development/testing
    res.json({
      id: 'user1',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });
  });
}

// Middleware to check if authenticated - always pass for now
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  // Set a mock user
  (req as any).user = { claims: { sub: 'user1' } };
  return next();
}