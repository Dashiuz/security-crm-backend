export type LoginResult = {
  accessToken: string;
  refreshCookie: { name: string; value: string; options: any };
};
