import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ example: 'My Customer Tenant' })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({ example: 'customer-slug' })
  slug!: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ example: true })
  isActive?: boolean;
}
