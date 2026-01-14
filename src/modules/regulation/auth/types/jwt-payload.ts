export type JwtPayload = {
  sub: string; // userId
  tenantId: string;
  permissions: string[];
  jti: string;
};
