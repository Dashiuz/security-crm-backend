import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'password' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '12345678' })
  document!: string;

  @IsOptional()
  @ApiPropertyOptional({ example: ['role_id_1'] })
  roleIds?: string[];
}
