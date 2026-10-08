import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFound(req, res, next) {
  return next(
    new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`)
  );
}

export function errorHandler(error, req, res, next) {
  if (error instanceof ZodError) {
    return res.status(422).json({
      message: "Validation failed",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    message: error.message || "Unexpected server error",
    ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {})
  });
}