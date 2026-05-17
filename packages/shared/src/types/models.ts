import { UserRole, DocumentStatus, RiskLevel, RapidRoleType, ApprovalStatus } from "./enums";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  createdAt: string;
}

export interface RapidDocument {
  id: string;
  documentCode: string;
  title: string;
  decisionSummary: string;
  businessContext?: string;
  problemStatement?: string;
  proposedDecision?: string;
  alternativesConsidered?: string;
  riskLevel: RiskLevel;
  complianceImpact: boolean;
  department: string;
  deadline: string;
  status: DocumentStatus;
  version: number;
  parentDocumentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  finalizedAt?: string;
}

export interface RapidRoleAssignment {
  id: string;
  documentId: string;
  roleType: RapidRoleType;
  userId: string;
  createdAt: string;
}

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { field: string; rule: string }[];
  };
}
