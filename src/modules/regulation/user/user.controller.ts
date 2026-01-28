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
  ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import {
  CreateUserDto,
  UpdateUserPasswordDto,
  UserResponseDto,
} from './dtos/index';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBody({ type: CreateUserDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.createUser(dto);
  }

  @Get('me')
  @ApiOkResponse({ type: UserResponseDto })
  async getMe(@Req() req: any): Promise<UserResponseDto> {
    return this.userService.getMe(req.user.id);
  }

  @Patch('password')
  @ApiOkResponse({
    schema: { properties: { message: { type: 'string' } } },
  })
  @ApiBody({ type: UpdateUserPasswordDto })
  async update(@Body() dto: UpdateUserPasswordDto): Promise<any> {
    return this.userService.changeUserPassword(
      dto.document,
      dto.oldPassword,
      dto.newPassword,
    );
  }
}
