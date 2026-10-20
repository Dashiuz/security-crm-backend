import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  MinLength,
} from 'class-validator';

export class EnableEmployeeUserDto {
  @ApiProperty({
    description: 'Password for the newly created user account',
    example: 'Noxia2026*',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  @ApiPropertyOptional({
    description:
      'Role IDs to assign to the user. Defaults to EMPLOYEE role if not provided.',
    type: [String],
    example: ['role-cuid-1'],
  })
  @IsOptional()
  @IsArray()
  roleIds?: string[];
}
