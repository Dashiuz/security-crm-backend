import {
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Auth Refresh')
@Controller('auth')
export class AuthRefreshController {
  constructor(private readonly authService: AuthService) {}

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiOkResponse({
    description: 'Returns a new access token and updates the refresh cookie.',
    schema: {
      example: { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken)
      throw new UnauthorizedException('No refresh token found');

    const result = await this.authService.refresh(refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.cookie(
      result.refreshCookie.name,
      result.refreshCookie.value,
      result.refreshCookie.options,
    );
    return { accessToken: result.accessToken };
  }

  // Cookie-based logout
  @Post('logout')
  @ApiOperation({
    summary: 'Logout current session (Clear refresh token cookie)',
  })
  @ApiOkResponse({
    description: 'Successfully logged out.',
    schema: { example: { ok: true } },
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    const cleared = this.authService.clearRefreshCookie();
    res.cookie(cleared.name, cleared.value, cleared.options);

    return { ok: true };
  }
}
