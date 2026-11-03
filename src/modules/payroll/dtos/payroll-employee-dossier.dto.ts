import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EmploymentContractType,
  EmployeeSalaryMode,
  BankAccountType,
  MilitaryCardClass,
  MaritalStatus,
  EducationLevel,
  HousingType,
  FamilyRelationship,
  HiringRequirementStatus,
  ArlRiskClass,
} from '@prisma/client';

export class UpsertPayrollProfileDto {
  @ApiPropertyOptional({ description: 'Sucursal de nómina' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Dependencia o puesto de trabajo principal',
  })
  @IsOptional()
  @IsString()
  primaryDependencyId?: string;

  @ApiPropertyOptional({
    enum: EmploymentContractType,
    default: EmploymentContractType.FIXED_TERM,
  })
  @IsOptional()
  @IsEnum(EmploymentContractType)
  contractType?: EmploymentContractType;

  @ApiPropertyOptional({ description: 'Número de contrato interno' })
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @ApiPropertyOptional({
    description:
      'Fecha de vencimiento de contrato (para alerta preaviso Art 46 CST)',
  })
  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @ApiPropertyOptional({ description: 'Fecha fin periodo de prueba' })
  @IsOptional()
  @IsDateString()
  probationEndDate?: string;

  @ApiPropertyOptional({
    enum: EmployeeSalaryMode,
    default: EmployeeSalaryMode.BY_DEPENDENCY,
  })
  @IsOptional()
  @IsEnum(EmployeeSalaryMode)
  salaryMode?: EmployeeSalaryMode;

  @ApiPropertyOptional({
    description: 'Sueldo básico pactado en hoja de vida',
    default: 1750905.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customBaseSalary?: number;

  @ApiPropertyOptional({
    description: 'Recibe auxilio de transporte',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  hasTransportAllowance?: boolean;

  @ApiPropertyOptional({
    description: 'Monto de anticipo quincenal fijo opcional',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customAdvanceValue?: number;

  @ApiPropertyOptional({
    description: 'Es salario integral (> 13 SMMLV)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isIntegralSalary?: boolean;

  @ApiPropertyOptional({
    description: 'Tipo de cotizante PILA (ej. 01, 12, 19)',
    default: '01',
  })
  @IsOptional()
  @IsString()
  pilaContributorType?: string;

  @ApiPropertyOptional({
    description: 'Subtipo de cotizante PILA (ej. 00, 01)',
    default: '00',
  })
  @IsOptional()
  @IsString()
  pilaContributorSubtype?: string;

  @ApiPropertyOptional({
    description: 'Indica si es pensionado activo',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPensioner?: boolean;

  @ApiPropertyOptional({ enum: ArlRiskClass, default: ArlRiskClass.RISK_IV })
  @IsOptional()
  @IsEnum(ArlRiskClass)
  arlRiskClass?: ArlRiskClass;

  @ApiPropertyOptional({ description: 'ID de la entidad EPS afiliada' })
  @IsOptional()
  @IsString()
  epsEntityId?: string;

  @ApiPropertyOptional({ description: 'ID de la entidad AFP (Fondo Pensión)' })
  @IsOptional()
  @IsString()
  afpEntityId?: string;

  @ApiPropertyOptional({ description: 'ID de la entidad de Cesantías' })
  @IsOptional()
  @IsString()
  cesantiasEntityId?: string;

  @ApiPropertyOptional({ description: 'ID de la Caja de Compensación (CCF)' })
  @IsOptional()
  @IsString()
  ccfEntityId?: string;

  @ApiPropertyOptional({ description: 'ID del Banco ACH para dispersión' })
  @IsOptional()
  @IsString()
  bankId?: string;

  @ApiPropertyOptional({
    enum: BankAccountType,
    default: BankAccountType.SAVINGS,
  })
  @IsOptional()
  @IsEnum(BankAccountType)
  bankAccountType?: BankAccountType;

  @ApiPropertyOptional({
    description: 'Número de cuenta bancaria o depósito electrónico',
  })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Código DANE ciudad de nacimiento' })
  @IsOptional()
  @IsString()
  daneBirthCityCode?: string;

  @ApiPropertyOptional({ description: 'Nombre ciudad de nacimiento' })
  @IsOptional()
  @IsString()
  daneBirthCityName?: string;

  @ApiPropertyOptional({
    description: 'Código DANE ciudad de residencia',
    default: '11001',
  })
  @IsOptional()
  @IsString()
  daneCityCode?: string;

  @ApiPropertyOptional({
    description: 'Nombre ciudad de residencia',
    default: 'BOGOTÁ D.C.',
  })
  @IsOptional()
  @IsString()
  daneCityName?: string;

  @ApiPropertyOptional({ description: 'Barrio de residencia' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({
    description: 'Estrato socioeconómico 1-6',
    default: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stratum?: number;

  @ApiPropertyOptional({ enum: MaritalStatus, default: MaritalStatus.SINGLE })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @ApiPropertyOptional({
    description: 'Grupo sanguíneo y factor RH (ej. O+, A+)',
  })
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiPropertyOptional({
    enum: EducationLevel,
    default: EducationLevel.HIGH_SCHOOL,
  })
  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;

  @ApiPropertyOptional({ enum: HousingType, default: HousingType.RENTED })
  @IsOptional()
  @IsEnum(HousingType)
  housingType?: HousingType;

  @ApiPropertyOptional({ description: 'Medio de transporte habitual' })
  @IsOptional()
  @IsString()
  transportMeans?: string;

  @ApiPropertyOptional({ description: 'Número libreta militar' })
  @IsOptional()
  @IsString()
  militaryCardNumber?: string;

  @ApiPropertyOptional({
    enum: MilitaryCardClass,
    default: MilitaryCardClass.NOT_APPLICABLE,
  })
  @IsOptional()
  @IsEnum(MilitaryCardClass)
  militaryCardClass?: MilitaryCardClass;

  @ApiPropertyOptional({ description: 'Distrito militar' })
  @IsOptional()
  @IsString()
  militaryDistrict?: string;

  @ApiPropertyOptional({ description: 'Talla de camisa (ej. M, L)' })
  @IsOptional()
  @IsString()
  shirtSize?: string;

  @ApiPropertyOptional({ description: 'Talla de pantalón (ej. 32, 34)' })
  @IsOptional()
  @IsString()
  pantsSize?: string;

  @ApiPropertyOptional({ description: 'Talla de calzado (ej. 40, 41)' })
  @IsOptional()
  @IsString()
  footwearSize?: string;

  @ApiPropertyOptional({ description: 'Causal de retiro B.D.N' })
  @IsOptional()
  @IsString()
  exitReasonId?: string;

  @ApiPropertyOptional({ description: 'Observaciones de retiro' })
  @IsOptional()
  @IsString()
  exitNotes?: string;

  @ApiPropertyOptional({
    description: 'Bloqueado para recontratación por falta grave (B.D.N)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isBlockedForRehire?: boolean;

  // Sincronización base opcional del empleado
  @ApiPropertyOptional({ description: 'Fecha de ingreso general del empleado' })
  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @ApiPropertyOptional({ description: 'Estado de retiro del empleado' })
  @IsOptional()
  @IsBoolean()
  isRetired?: boolean;

  @ApiPropertyOptional({ description: 'Fecha efectiva de retiro' })
  @IsOptional()
  @IsDateString()
  retiredAt?: string;
}

export class CreateFamilyMemberDto {
  @ApiProperty({ description: 'Nombre completo del beneficiario' })
  @IsString()
  fullName: string;

  @ApiProperty({ enum: FamilyRelationship, description: 'Parentesco' })
  @IsEnum(FamilyRelationship)
  relationship: FamilyRelationship;

  @ApiPropertyOptional({ description: 'Tipo documento', default: 'TI' })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ description: 'Número de documento' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ description: 'Fecha de nacimiento' })
  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @ApiPropertyOptional({ description: 'Género' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Teléfono' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Tiene derecho a cuota monetaria CCF',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isDependentForSubsidy?: boolean;

  @ApiPropertyOptional({
    description: 'Acredita certificado de estudio',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isScholar?: boolean;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRequirementCheckDto {
  @ApiProperty({
    enum: HiringRequirementStatus,
    description: 'Estado de verificación',
  })
  @IsEnum(HiringRequirementStatus)
  status: HiringRequirementStatus;

  @ApiPropertyOptional({ description: 'Fecha de emisión del documento' })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha de vencimiento (ej. Examen psicofísico)',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Llave S3 del documento adjunto' })
  @IsOptional()
  @IsString()
  s3Key?: string;

  @ApiPropertyOptional({ description: 'Nombre original del archivo' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: 'Notas u observaciones del revisor' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSvspCourseDto {
  @ApiProperty({
    description: 'ID del nivel de vigilancia SVSP (ej. 1101, 1201)',
  })
  @IsString()
  svspLevelId: string;

  @ApiProperty({ description: 'ID de la academia o escuela de seguridad' })
  @IsString()
  academyId: string;

  @ApiProperty({ description: 'Código NRO oficial de la SuperVigilancia' })
  @IsString()
  nroCode: string;

  @ApiPropertyOptional({ description: 'Número de acta o certificado' })
  @IsOptional()
  @IsString()
  certificateNumber?: string;

  @ApiProperty({ description: 'Fecha de grado o acreditación' })
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional({
    description:
      'Fecha de vencimiento (calculada por defecto a 365 días si se omite)',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Llave S3 del diploma/acta' })
  @IsOptional()
  @IsString()
  s3Key?: string;

  @ApiPropertyOptional({ description: 'Nombre de archivo' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInternalTrainingDto {
  @ApiProperty({ description: 'Título de la capacitación o charla' })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Tema o módulo (ej. SG-SST, Polígono, Atención)',
  })
  @IsString()
  topic: string;

  @ApiProperty({ description: 'Nombre del instructor o facilitador' })
  @IsString()
  instructorName: string;

  @ApiProperty({ description: 'Fecha de realización' })
  @IsDateString()
  trainingDate: string;

  @ApiPropertyOptional({ description: 'Duración en horas', default: 2.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  durationHours?: number;

  @ApiPropertyOptional({
    description: 'Calificación escala Pronos 1.0 a 5.0',
    default: 5.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  score?: number;

  @ApiPropertyOptional({ description: 'Aprobó la capacitación', default: true })
  @IsOptional()
  @IsBoolean()
  approved?: boolean;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryPayrollEmployeesDto {
  @ApiPropertyOptional({
    description: 'Búsqueda por nombre, apellido, cédula o código NRO',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por sucursal de nómina' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por puesto / dependencia asignada',
  })
  @IsOptional()
  @IsString()
  dependencyId?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar por estado del curso SVSP (VALID, EXPIRING_SOON, EXPIRED, MISSING)',
  })
  @IsOptional()
  @IsString()
  svspStatus?: string;

  @ApiPropertyOptional({
    description: 'Filtrar solo personal activo',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class ApplySalaryAdjustmentDto {
  @ApiProperty({
    enum: EmployeeSalaryMode,
    description: 'Nuevo modo salarial del trabajador',
    default: EmployeeSalaryMode.CUSTOM_FIXED,
  })
  @IsEnum(EmployeeSalaryMode)
  salaryMode: EmployeeSalaryMode;

  @ApiProperty({
    description: 'Tipo de ajuste: PERCENTAGE (+%) o FIXED_AMOUNT ($ COP)',
    enum: ['PERCENTAGE', 'FIXED_AMOUNT'],
    default: 'PERCENTAGE',
  })
  @IsString()
  adjustmentType: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @ApiPropertyOptional({
    description: 'Porcentaje de aumento (ej: 8.5 para +8.5%)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  increasePct?: number;

  @ApiPropertyOptional({
    description:
      'Nuevo salario fijo en COP (si adjustmentType es FIXED_AMOUNT)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  newSalary?: number;

  @ApiProperty({
    description: 'Fecha efectiva de aplicación del nuevo salario',
    example: '2026-11-01',
  })
  @IsDateString()
  effectiveDate: string;

  @ApiProperty({
    description: 'Motivo del ajuste salarial',
    example: 'Ascenso a Supervisor Operativo',
  })
  @IsString()
  reason: string;
}
