import {
  Controller,
  Body,
  Param,
  Post,
  Get,
  Patch,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import {
  CreateUserDto,
  UpdateUserPasswordDto,
  UserResponseDto,
} from './dtos/index';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../access-control/permissions.guard';
import { RequirePermissions } from '../access-control/permissions.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @RequirePermissions('user:manage', 'user:create')
  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid data or user already exists' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBody({ type: CreateUserDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.createUser(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getMe(@Req() req: any): Promise<UserResponseDto> {
    return this.userService.getMe(req.user.sub);
  }

  @RequirePermissions('user:manage', 'user:read')
  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiOkResponse({ type: [UserResponseDto] })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(): Promise<UserResponseDto[]> {
    return this.userService.findAll();
  }

  @RequirePermissions('user:manage', 'user:passwordchange')
  @Patch('password')
  @ApiOperation({ summary: 'Update user password' })
  @ApiOkResponse({
    schema: { properties: { message: { type: 'string' } } },
  })
  @ApiBadRequestResponse({
    description: 'Invalid current password or weak new password',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBody({ type: UpdateUserPasswordDto })
  async update(@Body() dto: UpdateUserPasswordDto): Promise<any> {
    return this.userService.changeUserPassword(
      dto.document,
      dto.oldPassword,
      dto.newPassword,
    );
  }
}
