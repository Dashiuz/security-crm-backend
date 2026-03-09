export interface UserContext {
  sub: string;
  tenantId: string;
  permissions: string[];
  roles: string[];
}
