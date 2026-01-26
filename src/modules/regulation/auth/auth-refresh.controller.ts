import { Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth/refresh')
export class AuthRefreshController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const refreshToken = (req as any).cookies?.refresh_token as
      | string
      | undefined;

    const result = await this.authService.refresh(refreshToken, {
      ip,
      userAgent,
    });

    res.cookie(
      result.refreshCookie.name,
      result.refreshCookie.value,
      result.refreshCookie.options,
    );
    return { accessToken: result.accessToken };
  }

  // Cookie-based logout
  @Post('cookie-logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req as any).cookies?.refresh_token as
      | string
      | undefined;

    await this.authService.logout(refreshToken);

    const cleared = this.authService.clearRefreshCookie();
    res.cookie(cleared.name, cleared.value, cleared.options);

    return { ok: true };
  }
}
