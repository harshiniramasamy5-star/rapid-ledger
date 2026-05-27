/** Shared API response types — eliminates `any` in page components */
export type { ApiError } from "@rapid-ledger/shared";


export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface RoleAssignment {
  id: string;
  documentId: string;
  userId: string;
  roleType: string;
  user?: { id: string; name: string; email: string };
  name?: string;
}

export interface Evidence {
  id: string;
  title: string;
  type: string;
  urlOrPath: string;
  description?: string | null;
}

export interface Approval {
  id: string;
  documentId: string;
  approverId: string;
  decision: string;
  comment?: string | null;
  document?: ApiDocument;
}

export interface ApiDocument {
  id: string;
  documentCode: string;
  version: number;
  title: string;
  status: string;
  riskLevel: string;
  complianceImpact: boolean;
  decisionSummary: string;
  businessContext?: string | null;
  problemStatement?: string | null;
  proposedDecision?: string | null;
  alternativesConsidered?: string | null;
  department?: string | null;
  deadline?: string | null;
  createdById: string;
  createdBy?: string;
  roleAssignments?: RoleAssignment[];
  evidence?: Evidence[];
  approvals?: Approval[];
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  details?: Record<string, unknown>;
  documentCode?: string;
  documentTitle?: string;
  actorName?: string;
  actorRole?: string;
  objectId?: string;
}

export interface LedgerEntry {
  id: string;
  documentCode: string;
  version: number;
  title: string;
  finalizedBy: string;
  finalizedAt: string;
  summary?: string;
  riskLevel?: string;
  complianceImpact?: boolean;
  finalDecision?: string;
  decideOwner?: { name: string; email: string };
  performOwner?: { name: string; email: string };
}

export function getApiError(err: unknown, fallback = "Something went wrong"): string {
  if (typeof err === "object" && err !== null) {
    const e = err as { error?: { message?: string }; message?: string };
    return e.error?.message ?? e.message ?? fallback;
  }
  return fallback;
}
