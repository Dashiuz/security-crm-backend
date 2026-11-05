import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CodeType, CodePurpose, CodeStatus } from '@prisma/client';

export class CreateUniversalCodeDto {
  @ApiPropertyOptional({
    description:
      'Código canónico personalizado (opcional; si se omite, el sistema lo genera automáticamente)',
    example: 'LORO-QR-A8910',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    description: 'Tipo de simbología (código QR o código de barras)',
    enum: CodeType,
    example: CodeType.QR_CODE,
  })
  @IsEnum(CodeType)
  codeType!: CodeType;

  @ApiProperty({
    description: 'Finalidad operativa del código',
    enum: CodePurpose,
    example: CodePurpose.PATROL_CHECKPOINT,
  })
  @IsEnum(CodePurpose)
  purpose!: CodePurpose;

  @ApiProperty({
    description: 'Título descriptivo o etiqueta de marcación',
    example: 'Punto de Ronda - Garita Principal Entrada Sur',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada o instrucciones para el operador',
    example: 'Escanear cada 60 minutos con la app de patrullaje',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Departamento o área responsable (Operaciones, Mantenimiento, etc.)',
    example: 'Operaciones',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'ID del Cliente / Copropiedad asociada (opcional)',
    example: 'cm12345clientid',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Identificador de lote de emisión',
    example: 'LOTE-20261103-A892',
  })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({
    description:
      'Metadatos dinámicos JSONB según la finalidad (número de serie, piso, intervalos, placa, etc.)',
    example: { floor: -1, checkpointIntervalMinutes: 60 },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateUniversalCodeDto {
  @ApiPropertyOptional({
    description: 'Título descriptivo o etiqueta de marcación',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Departamento o área responsable',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'ID del Cliente / Copropiedad asociada',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Identificador de lote de emisión',
  })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({
    description: 'Estado del código',
    enum: CodeStatus,
  })
  @IsOptional()
  @IsEnum(CodeStatus)
  status?: CodeStatus;

  @ApiPropertyOptional({
    description: 'Metadatos dinámicos JSONB',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class QueryUniversalCodesDto {
  @ApiPropertyOptional({
    description: 'Búsqueda por texto en código, título o departamento',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de simbología',
    enum: CodeType,
  })
  @IsOptional()
  @IsEnum(CodeType)
  codeType?: CodeType;

  @ApiPropertyOptional({
    description: 'Filtrar por finalidad operativa',
    enum: CodePurpose,
  })
  @IsOptional()
  @IsEnum(CodePurpose)
  purpose?: CodePurpose;

  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: CodeStatus,
  })
  @IsOptional()
  @IsEnum(CodeStatus)
  status?: CodeStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por identificador de lote',
  })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID de cliente',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Página solicitada',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description:
      'Cantidad de registros por página (hasta 250 para lotes e impresión)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(250)
  limit?: number = 20;
}

export class UniversalCodeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ enum: CodeType })
  codeType!: CodeType;

  @ApiProperty({ enum: CodePurpose })
  purpose!: CodePurpose;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  department?: string | null;

  @ApiPropertyOptional()
  clientId?: string | null;

  @ApiPropertyOptional()
  batchId?: string | null;

  @ApiProperty({ enum: CodeStatus })
  status!: CodeStatus;

  @ApiPropertyOptional()
  metadata?: Record<string, any> | null;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiPropertyOptional()
  createdBy?: {
    id: string;
    fullName: string;
    document?: string | null;
  } | null;

  @ApiPropertyOptional()
  updatedById?: string | null;

  @ApiPropertyOptional()
  updatedBy?: {
    id: string;
    fullName: string;
    document?: string | null;
  } | null;

  @ApiPropertyOptional()
  client?: {
    id: string;
    name: string;
    internalCode?: string;
  } | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CreateBatchUniversalCodesDto {
  @ApiProperty({
    description: 'Tipo de simbología (código QR o código de barras)',
    enum: CodeType,
    example: CodeType.BARCODE_128,
  })
  @IsEnum(CodeType)
  codeType!: CodeType;

  @ApiProperty({
    description: 'Finalidad operativa del código',
    enum: CodePurpose,
    example: CodePurpose.INVENTORY_ASSET,
  })
  @IsEnum(CodePurpose)
  purpose!: CodePurpose;

  @ApiProperty({
    description: 'Cantidad de códigos a emitir en el lote (1 a 100)',
    example: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;

  @ApiProperty({
    description: 'Patrón o prefijo base del título',
    example: 'Cámara de Seguridad Almacén',
  })
  @IsString()
  @IsNotEmpty()
  titlePattern!: string;

  @ApiPropertyOptional({
    description:
      'Identificador de lote personalizado (opcional; si se omite, se autogenera)',
    example: 'LOTE-20261103-CAM01',
  })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({
    description: 'Departamento o área responsable',
    example: 'Almacén',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'ID del Cliente / Copropiedad asociada',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Metadatos iniciales compartidos para el lote',
  })
  @IsOptional()
  @IsObject()
  baseMetadata?: Record<string, any>;
}

export class BatchUpdateItemDto {
  @ApiProperty({ description: 'ID del código a actualizar' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiPropertyOptional({ description: 'Título específico del ítem' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Departamento o área responsable' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Estado del código', enum: CodeStatus })
  @IsOptional()
  @IsEnum(CodeStatus)
  status?: CodeStatus;

  @ApiPropertyOptional({
    description: 'Metadatos específicos (serial, marca, etc.)',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BatchUpdateUniversalCodesDto {
  @ApiProperty({
    description: 'Lista de ítems del lote a actualizar',
    type: [BatchUpdateItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchUpdateItemDto)
  items!: BatchUpdateItemDto[];
}
