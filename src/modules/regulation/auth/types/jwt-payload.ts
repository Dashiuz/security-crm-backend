export type JwtPayload = {
  sub: string; // userId
  tenantId: string;
  permissions: string[];
  roles: string[];
  features: string[];
  jti: string;
};
