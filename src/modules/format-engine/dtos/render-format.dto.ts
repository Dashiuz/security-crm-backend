import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RenderFormatDto {
  @ApiPropertyOptional({ description: 'ID de entidad para contextualizar datos (Cliente, Empleado o Propuesta)' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Tipo de entidad', example: 'EMPLOYEE' })
  @IsOptional()
  @IsString()
  entityType?: 'CLIENT' | 'EMPLOYEE' | 'PROPOSAL' | 'GENERAL';

  @ApiPropertyOptional({ description: 'Plantilla explícita si se renderiza borrador sin guardar' })
  @IsOptional()
  @IsString()
  customTemplateHtml?: string;

  @ApiPropertyOptional({ description: 'Variables adicionales inyectadas ad-hoc', type: Object })
  @IsOptional()
  @IsObject()
  additionalVariables?: Record<string, any>;
}
