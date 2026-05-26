export interface ApiError { error: { code: string; message: string; details?: string[] } }

export const Errors = {
  unauthorized: (message = "Authentication required"): ApiError =>
    ({ error: { code: "UNAUTHORIZED", message } }),
  forbidden: (message = "You do not have permission"): ApiError =>
    ({ error: { code: "FORBIDDEN", message } }),
  notFound: (resource = "Resource"): ApiError =>
    ({ error: { code: "NOT_FOUND", message: `${resource} not found` } }),
  badRequest: (message: string, details?: string[]): ApiError =>
    ({ error: { code: "BAD_REQUEST", message, details } }),
  conflict: (message: string): ApiError =>
    ({ error: { code: "CONFLICT", message } }),
  invalidStatus: (current: string, allowed: string[]): ApiError =>
    ({ error: { code: "INVALID_STATUS_TRANSITION", message: `Cannot act on document with status "${current}"`, details: [`Allowed from: ${allowed.join(", ")}`] } }),
} as const;
