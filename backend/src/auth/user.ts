export interface AppUser {
  id: string;
  roles: string[];
  orgId?: string | null;
  permissions?: string[];
}

export interface RequestScope {
  orgId?: string | null;
  programId?: string | null;
}
