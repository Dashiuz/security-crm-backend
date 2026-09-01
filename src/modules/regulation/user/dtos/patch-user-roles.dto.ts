import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class PatchUserRolesDto {
  @ApiPropertyOptional({ example: ['rol_cuid_1', 'rol_cuid_2'] })
  @IsArray({ message: 'Los roles a agregar deben estar en una lista.' })
  @IsString({ each: true, message: 'Cada ID de rol a agregar debe ser un texto válido.' })
  @IsOptional()
  addRoleIds?: string[];

  @ApiPropertyOptional({ example: ['rol_cuid_3'] })
  @IsArray({ message: 'Los roles a remover deben estar en una lista.' })
  @IsString({ each: true, message: 'Cada ID de rol a remover debe ser un texto válido.' })
  @IsOptional()
  removeRoleIds?: string[];
}
