import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({
    example: 'employee:read',
    description: 'Unique permission key',
  })
  key!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @ApiProperty({
    example: 'Can read employee data',
    description: 'Description of the permission',
    required: false,
  })
  desc?: string;
}
