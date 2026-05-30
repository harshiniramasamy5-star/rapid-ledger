import type { User, RapidDocument, RoleAssignment, Approval, LedgerEntry, AuditLog } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/** Fix 4: lowercase `user` in login response */
export interface LoginResponse {
  token: string;
  user: PublicUser;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
}

export interface CreateDocumentBody {
  title: string;
  decisionSummary: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  complianceImpact?: boolean;
  department?: string;
  deadline?: string;
  businessContext?: string;
  problemStatement?: string;
  proposedDecision?: string;
  alternativesConsidered?: string;
}

export interface ValidationError {
  rule: string;
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface AuditDetails {
  [key: string]: string | number | boolean | null | undefined;
}

export type { User, RapidDocument, RoleAssignment, Approval, LedgerEntry, AuditLog };
export type { DocumentStatus, RapidRole, UserRole, LoginResponse } from "@rapid-ledger/shared";
