import { Controller, Get } from '@nestjs/common';
import {
  ApiResponse,
  ApiTags,
  ApiOperation,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    return this.authService.generateDummyToken();
  }
}
