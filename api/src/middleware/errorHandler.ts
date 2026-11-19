import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

/** Runs when no route matched. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", `No route for ${req.method} ${req.path}`));
};

/**
 * The single place where errors become HTTP responses.
 *
 * Express 5 sends errors thrown inside `async` route handlers here
 * automatically (Express 4 needed try/catch or a wrapper in every route).
 * An error handler is recognised by having FOUR parameters, and it must be
 * registered after all routes.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong on our side.";
  let details: unknown = null;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    // Thrown by schema.parse(): turn each issue into { path, message } (API.md §1).
    status = 400;
    code = "VALIDATION_ERROR";
    message = "Some fields are invalid.";
    details = err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
  } else if (isBodyParserError(err) && err.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_JSON";
    message = "The request body is not valid JSON.";
  } else if (isBodyParserError(err) && err.type === "entity.too.large") {
    status = 400;
    code = "VALIDATION_ERROR";
    message = "The request body is too large.";
  } else {
    // A real bug. Log everything server-side; tell the client nothing internal.
    console.error(`[${req.id}] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(status).json({ error: { code, message, details, requestId: req.id } });
};

function isBodyParserError(err: unknown): err is { type: string } {
  return typeof err === "object" && err !== null && "type" in err && typeof err.type === "string";
}
