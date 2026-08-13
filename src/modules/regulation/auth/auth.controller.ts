import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { UserRepositoryService } from '../../../common/repository/index';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dtos/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userRepository: UserRepositoryService,
  ) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: 'Login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    schema: {
      example: { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    },
  })
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(req.user as any, {
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

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('all-sessions-logout')
  @ApiOperation({
    summary: 'Logout by access token (Revoke all user sessions)',
  })
  @ApiOkResponse({ schema: { properties: { ok: { type: 'boolean' } } } })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async logoutByAccessToken(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.sub as string;

    await this.authService.logoutAllSessions(userId);

    // optional: clear cookie (if client also had cookie)
    const cleared = this.authService.clearRefreshCookie();
    res.cookie(cleared.name, cleared.value, cleared.options);

    return { ok: true };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('impersonate/:tenantId')
  @ApiOperation({ summary: 'Impersonate a tenant' })
  @ApiOkResponse({
    schema: { properties: { accessToken: { type: 'string' } } },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async impersonate(
    @Req() req: any,
    @Param('tenantId') targetTenantId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.sub as string;
    const currentTenantId = req.user.tenantId;

    const result = await this.authService.impersonateTenant(
      userId,
      currentTenantId,
      targetTenantId,
      { ip: req.ip, userAgent: req.headers['user-agent'] },
      req.cookies?.refresh_token,
    );

    res.cookie(
      result.refreshCookie.name,
      result.refreshCookie.value,
      result.refreshCookie.options,
    );

    return { accessToken: result.accessToken };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('impersonate-exit')
  @ApiOperation({ summary: 'Exit impersonation' })
  @ApiOkResponse({
    schema: { properties: { accessToken: { type: 'string' } } },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async exitImpersonation(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.sub as string;
    const originalTenantId = req.user.originalTenantId;

    if (!originalTenantId) {
      return { ok: true };
    }

    const result = await this.authService.exitImpersonation(
      userId,
      originalTenantId,
      { ip: req.ip, userAgent: req.headers['user-agent'] },
      req.cookies?.refresh_token,
    );

    res.cookie(
      result.refreshCookie.name,
      result.refreshCookie.value,
      result.refreshCookie.options,
    );

    return { accessToken: result.accessToken };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user session info' })
  @ApiOkResponse({
    schema: {
      properties: {
        user: { type: 'object' },
        tenantId: { type: 'string' },
        permissions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async me(@Req() req: any) {
    const userId = req.user.sub as string;
    const targetTenantId = req.user.tenantId as string;
    const me = await this.userRepository.getMe(userId, targetTenantId);
    return {
      user: me,
      tenantId: req.user.tenantId,
      permissions: req.user.permissions,
      isImpersonating: req.user.isImpersonating || false,
      originalTenantId: req.user.originalTenantId || null,
    };
  }
}
