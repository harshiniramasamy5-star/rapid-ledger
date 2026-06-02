// Core enums and labels — single source of truth
export {
  UserRole,
  DocumentStatus,
  RiskLevel,
  AuditAction,
  STATUS_LABELS,
  RISK_LABELS,
  ROLE_LABELS,
} from '@rapid-ledger/shared';

export type { User, RapidDocument, AuditLog, LoginResponse } from '@rapid-ledger/shared';

// API-layer RoleAssignment — backend returns roleType + name, not rapidRole
export interface RoleAssignment {
  id: string;
  documentId: string;
  userId: string;
  roleType: string;
  name?: string;
  user?: { id: string; name: string; email: string };
}

// API-layer Evidence
export interface Evidence {
  id: string;
  title: string;
  type: string;
  urlOrPath: string;
  description?: string | null;
}

// API-layer Approval — backend returns documentId + decision, not document object shape from shared
export interface Approval {
  id: string;
  documentId: string;
  approverId: string;
  decision: string;
  comment?: string | null;
  document: ApiDocument;
}

// API-layer LedgerEntry — backend returns enriched fields not in shared
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

// API-layer ApiUser
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  isActive: boolean;
  createdAt: string;
}

// API-layer ApiDocument — full shape returned by backend
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
  slaBreached?: boolean;
  createdById: string;
  createdBy?: string;
  roleAssignments?: RoleAssignment[];
  evidence?: Evidence[];
  approvals?: Approval[];
  recommendationNotes?: string | null;
  inputNotes?: string | null;
}

// API-layer AuditEntry
export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
  documentCode?: string;
  documentTitle?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

// Utility
export function getApiError(err: unknown, fallback = 'Something went wrong'): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { error?: { message?: string }; message?: string };
    return e.error?.message ?? e.message ?? fallback;
  }
  return fallback;
}

export interface DocComment {
  id: string;
  content: string;
  documentId: string;
  authorId: string;
  parentId?: string | null;
  createdAt: string;
  author: { id: string; name: string; role: string };
  replies: Comment[];
}
