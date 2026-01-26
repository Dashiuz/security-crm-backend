import {
  Controller,
  Body,
  Param,
  Post,
  Get,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserPasswordDto } from './dtos/index';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiBody({ type: CreateUserDto })
  create(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  @Patch('password')
  @ApiBody({ type: UpdateUserPasswordDto })
  update(@Body() dto: UpdateUserPasswordDto) {
    return this.userService.changeUserPassword(
      dto.document,
      dto.oldPassword,
      dto.newPassword,
    );
  }
}
