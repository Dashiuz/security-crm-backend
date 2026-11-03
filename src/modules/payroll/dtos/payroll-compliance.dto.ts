import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import {
  PilaBatchStatus,
  DianProviderMode,
  DianEnvironmentType,
  ElectronicPayrollStatus,
  ElectronicDocumentType,
  AccountingExportFormat,
} from '@prisma/client';

// ============================================================================
// 1. PILA (PLANILLA ÚNICA RES. 2388) DTOS
// ============================================================================

export class GeneratePilaBatchDto {
  @ApiProperty({ description: 'ID del periodo de nómina a liquidar en PILA' })
  @IsString()
  @IsNotEmpty()
  periodId: string;

  @ApiProperty({
    description: 'ID de la sucursal (opcional, si filtra por sucursal)',
    required: false,
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({
    example: 'SOI',
    description: 'Operador de información PILA',
    required: false,
  })
  @IsOptional()
  @IsString()
  operatorName?: string;
}

export class QueryPilaLinesDto {
  @ApiProperty({
    description: 'Buscar por documento o nombre de cotizante',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filtrar por novedad (ING, RET, IGE, IRL, SLN, VAC)',
    required: false,
  })
  @IsOptional()
  @IsString()
  noveltyFilter?: string;
}

// ============================================================================
// 2. NÓMINA ELECTRÓNICA DIAN (RES. 000013) DTOS
// ============================================================================

export class GenerateElectronicBatchDto {
  @ApiProperty({ description: 'ID del periodo de nómina' })
  @IsString()
  @IsNotEmpty()
  periodId: string;

  @ApiProperty({
    enum: DianProviderMode,
    default: DianProviderMode.INTERNAL_DIAN_STANDARD,
    description: 'Modo de generación/proveedor DIAN',
    required: false,
  })
  @IsOptional()
  @IsEnum(DianProviderMode)
  providerMode?: DianProviderMode;

  @ApiProperty({
    enum: DianEnvironmentType,
    default: DianEnvironmentType.HABILITACION_2,
    description: 'Ambiente DIAN (Habilitación 2 o Producción 1)',
    required: false,
  })
  @IsOptional()
  @IsEnum(DianEnvironmentType)
  environment?: DianEnvironmentType;
}

export class CreateAdjustmentNoteDto {
  @ApiProperty({
    enum: [
      ElectronicDocumentType.ADJUSTMENT_NOTE_REPLACE,
      ElectronicDocumentType.ADJUSTMENT_NOTE_DELETE,
    ],
    description: 'Tipo de nota de ajuste (103-1 Reemplazar o 103-2 Eliminar)',
  })
  @IsEnum(ElectronicDocumentType)
  documentType: ElectronicDocumentType;

  @ApiProperty({ description: 'Motivo / justificación legal del ajuste' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class QueryElectronicDocumentsDto {
  @ApiProperty({
    description: 'Buscar por documento, nombre o número de consecutivo',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    enum: ElectronicPayrollStatus,
    description: 'Filtrar por estado',
    required: false,
  })
  @IsOptional()
  @IsEnum(ElectronicPayrollStatus)
  status?: ElectronicPayrollStatus;
}

// ============================================================================
// 3. INTERFAZ CONTABLE DTOS (WORLD OFFICE / HELISA)
// ============================================================================

export class GenerateAccountingBatchDto {
  @ApiProperty({
    description: 'ID del periodo de nómina a causar contablemente',
  })
  @IsString()
  @IsNotEmpty()
  periodId: string;

  @ApiProperty({
    enum: AccountingExportFormat,
    default: AccountingExportFormat.WORLD_OFFICE,
    description: 'Plantilla oficial de exportación contable',
    required: false,
  })
  @IsOptional()
  @IsEnum(AccountingExportFormat)
  exportFormat?: AccountingExportFormat;

  @ApiProperty({
    example: '2026-11-30',
    description: 'Fecha de causación contable',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  accountingDate?: string;

  @ApiProperty({
    example: 'NM-2026-11',
    description: 'Número de comprobante contable',
    required: false,
  })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// 4. CERTIFICADOS (FORMULARIO 220 DIAN & CONSTANCIAS LABORALES) DTOS
// ============================================================================

export class GenerateForm220Dto {
  @ApiProperty({ example: 2026, description: 'Año gravable a certificar' })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({
    description:
      'ID del empleado específico (opcional, si se genera individual)',
    required: false,
  })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ example: 'BOGOTÁ D.C.', required: false })
  @IsOptional()
  @IsString()
  expeditionCity?: string;
}

export class GenerateLaborCertificateDto {
  @ApiProperty({ description: 'ID del empleado a certificar' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({
    example: true,
    description: 'Si incluye salario promedio del último año',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeAverageSalary?: boolean;

  @ApiProperty({
    example: 'A QUIEN INTERESE',
    description: 'Destinatario de la certificación',
    required: false,
  })
  @IsOptional()
  @IsString()
  addressedTo?: string;

  @ApiProperty({
    description: 'Observaciones adicionales al cuerpo de la carta',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// 5. REPORTERÍA BI & ACUMULADOS ANUALES DTOS
// ============================================================================

export class QueryAccumulatedReportDto {
  @ApiProperty({ example: 2026, description: 'Año de acumulados' })
  @IsNumber()
  year: number;

  @ApiProperty({
    description: 'Filtrar por empleado específico',
    required: false,
  })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({
    description: 'Filtrar por cliente / centro de costo',
    required: false,
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({
    description: 'Filtrar por dependencia / puesto específico',
    required: false,
  })
  @IsOptional()
  @IsString()
  dependencyId?: string;

  @ApiProperty({
    description: 'Filtrar por tabla de agrupación (LIQ, PRI, CES, VAC, IBC)',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupTable?: string;
}
