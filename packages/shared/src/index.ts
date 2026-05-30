export type DocumentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'AWAITING_AGREEMENT'
  | 'APPROVED'
  | 'REJECTED'
  | 'FINALIZED'
  | 'EXECUTED';

export type RapidRole = 'RECOMMEND' | 'AGREE' | 'PERFORM' | 'INPUT' | 'DECIDE';

export type UserRole =
  | 'admin'
  | 'creator'
  | 'approver'
  | 'decision_owner'
  | 'performer'
  | 'auditor';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}
