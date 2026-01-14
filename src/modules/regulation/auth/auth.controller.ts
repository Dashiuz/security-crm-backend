import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dtos/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly users: UserService,
  ) {}

  @Get('DummyToken')
  @ApiOperation({ summary: 'Generate a dummy JWT token' })
  @ApiResponse({
    status: 200,
    description: 'the user successfully generated a dummy token',
  })
  @ApiNotFoundResponse({ description: 'Endpoint not found.' })
  @ApiInternalServerErrorResponse({
    description: 'Internal server Error, something unexpected happened.',
  })
  generateDummyToken() {
    return null; // Implement dummy token generation logic here
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
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

  @Post('refresh')
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

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req as any).cookies?.refresh_token as
      | string
      | undefined;
    await this.authService.logout(refreshToken);

    const cleared = this.authService.clearRefreshCookie();
    res.cookie(cleared.name, cleared.value, cleared.options);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const userId = req.user.sub as string;
    const me = await this.users.getMe(userId);
    return {
      user: me,
      tenantId: req.user.tenantId,
      permissions: req.user.permissions,
    };
  }
}
