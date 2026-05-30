export enum DocumentStatus {
  draft = "draft",
  submitted = "submitted",
  awaiting_agreement = "awaiting_agreement",
  approved = "approved",
  finalized = "finalized",
  execution_complete = "execution_complete",
  rejected = "rejected",
  changes_requested = "changes_requested",
}

export enum RiskLevel {
  low = "low",
  medium = "medium",
  high = "high",
  critical = "critical",
}

export enum UserRole {
  admin = "admin",
  creator = "creator",
  recommender = "recommender",
  approver = "approver",
  performer = "performer",
  viewer = "viewer",
}

export enum AuditAction {
  document_created = "document_created",
  document_submitted = "document_submitted",
  document_approved = "document_approved",
  document_rejected = "document_rejected",
  document_finalized = "document_finalized",
  document_versioned = "document_versioned",
  changes_requested = "changes_requested",
  ledger_created = "ledger_created",
  evidence_added = "evidence_added",
  role_assigned = "role_assigned",
  execution_complete = "execution_complete",
  user_login = "user_login",
  login_failed = "login_failed",
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface RoleAssignment {
  id: string;
  rapidRole: string;
  userId: string;
  user: Pick<User, "id" | "name" | "email">;
}

export interface Evidence {
  id: string;
  type: string;
  title: string;
  urlOrPath?: string | null;
  description?: string | null;
  uploadedBy: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  notes?: string | null;
  decidedAt?: string | null;
  approver: Pick<User, "id" | "name" | "email">;
  document: Pick<RapidDocument, "id" | "title" | "documentCode" | "status" | "riskLevel">;
}

export interface RapidDocument {
  id: string;
  documentCode: string;
  title: string;
  description?: string | null;
  status: DocumentStatus;
  riskLevel: RiskLevel;
  department?: string | null;
  version: number;
  parentDocumentId?: string | null;
  decideOwner?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  roleAssignments: RoleAssignment[];
  evidence: Evidence[];
  approvals?: Approval[];
}

export interface LedgerEntry {
  id: string;
  documentCode: string;
  version: number;
  title: string;
  finalizedBy: string;
  finalizedAt: string;
  createdAt: string;
  document?: RapidDocument;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  actor?: Pick<User, "id" | "name" | "email" | "role">;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  [DocumentStatus.draft]: "Draft",
  [DocumentStatus.submitted]: "Submitted",
  [DocumentStatus.awaiting_agreement]: "Awaiting Agreement",
  [DocumentStatus.approved]: "Approved",
  [DocumentStatus.finalized]: "Finalized",
  [DocumentStatus.execution_complete]: "Execution Complete",
  [DocumentStatus.rejected]: "Rejected",
  [DocumentStatus.changes_requested]: "Changes Requested",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  [RiskLevel.low]: "Low",
  [RiskLevel.medium]: "Medium",
  [RiskLevel.high]: "High",
  [RiskLevel.critical]: "Critical",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.admin]: "Admin",
  [UserRole.creator]: "Creator",
  [UserRole.recommender]: "Recommender",
  [UserRole.approver]: "Approver",
  [UserRole.performer]: "Performer",
  [UserRole.viewer]: "Viewer",
};
