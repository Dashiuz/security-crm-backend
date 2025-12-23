export type JwtPayload = {
  sub: string;
  scope?: string[];
  jti?: string;
  iat?: number;
};
