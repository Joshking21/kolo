// Teaches TypeScript about the extra fields our middleware adds to `req`.
// Phase 2 adds `user?: { id: string }` here, set by requireAuth.
declare global {
  namespace Express {
    interface Request {
      /** Set by middleware/requestId.ts on every request. */
      id: string;
    }
  }
}

export {};
