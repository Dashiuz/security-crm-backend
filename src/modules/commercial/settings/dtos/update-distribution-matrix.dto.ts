import {
  IsString,
  IsBoolean,
  IsEnum,
  IsEmail,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InternalDepartment } from '@prisma/client';

export class DistributionRecipientItemDto {
  @ApiPropertyOptional({ example: 'clx...' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({
    enum: InternalDepartment,
    example: InternalDepartment.OPERATIONS,
  })
  @IsEnum(InternalDepartment)
  department: InternalDepartment;

  @ApiProperty({
    example: 'Mayor Andrés Castro',
    description: 'Nombre del funcionario o responsable',
  })
  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @ApiProperty({
    example: 'operaciones@noxiaseguridad.com',
    description: 'Correo institucional de notificación',
  })
  @IsEmail()
  recipientEmail: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateDistributionMatrixDto {
  @ApiProperty({
    type: [DistributionRecipientItemDto],
    description: 'Matriz de distribución a dependencias internas',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DistributionRecipientItemDto)
  recipients: DistributionRecipientItemDto[];
}
