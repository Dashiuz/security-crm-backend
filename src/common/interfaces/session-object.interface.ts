export interface SessionObjectInterface {
  userId: string;
  refreshTokenHash: string;
  ip: string | undefined;
  userAgent: string | undefined;
  expiresAt: Date;
  impersonatedTenantId?: string;
}
