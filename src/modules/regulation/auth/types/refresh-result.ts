export type RefreshResult = {
  accessToken: string;
  refreshCookie?: { name: string; value: string; options: any };
};
