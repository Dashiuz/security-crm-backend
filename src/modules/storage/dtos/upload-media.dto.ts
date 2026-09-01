import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum MediaTypeCategory {
  MINUTA = 'MINUTA',
  VISITOR = 'VISITOR',
  CORRESPONDENCE = 'CORRESPONDENCE',
  PARKING = 'PARKING',
  EMPLOYEE = 'EMPLOYEE',
  CLIENT = 'CLIENT',
  INVENTORY = 'INVENTORY',
  DOCUMENT = 'DOCUMENT',
}

export class UploadMediaDto {
  @ApiProperty({
    enum: MediaTypeCategory,
    description: 'Categoría o tipo de entidad a la que pertenece el archivo',
  })
  @IsEnum(MediaTypeCategory)
  @IsNotEmpty()
  entityType: MediaTypeCategory;

  @ApiProperty({
    description: 'ID de la entidad principal (minutaId, visitorEntryId, employeeId, etc.)',
  })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({
    description: 'ID del cliente si la entidad está ligada a un conjunto/cliente',
  })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Subtipo o subcarpeta específica (ej: general, visitor, correspondence, parking, avatar, documents)',
  })
  @IsString()
  @IsOptional()
  subType?: string;

  @ApiPropertyOptional({
    description: 'Categoría secundaria para documentos generales',
  })
  @IsString()
  @IsOptional()
  category?: string;
}
