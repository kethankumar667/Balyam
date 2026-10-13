export interface AdminSuspensionState {
  isSuspended: boolean;
  reason: string | null;
  updatedAt: number | null;
  revision: number;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "super_admin" | "admin" | "member";
  accountKind: "member" | "guest";
  matchesPlayed: number;
  winRate: string;
  rating: number;
  joinedAt: number | null;
  lastActiveAt: number | null;
  favoriteGame: string;
  suspension: AdminSuspensionState;
}

export interface AdminUsersResponse {
  users: AdminUserSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminRecordSection {
  key: string;
  title: string;
  records: Record<string, unknown>[];
  page: number;
  pageSize: number;
  total: number | null;
  hasMore: boolean;
  unavailable?: string;
}

export interface AdminUserDetails {
  user: AdminUserSummary;
  sections: AdminRecordSection[];
  coverage: string[];
}

export interface AdminSuspensionRequest {
  action: "suspend" | "resume";
  reason: string;
  expectedRevision: number;
}

export interface AdminSuspensionResponse {
  suspension: AdminSuspensionState;
}