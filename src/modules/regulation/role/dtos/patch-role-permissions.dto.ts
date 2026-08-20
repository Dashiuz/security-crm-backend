import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class PatchRolePermissionsDto {
  @ApiPropertyOptional({ example: ['employee:read', 'employee:create'] })
  @IsArray({ message: 'Los permisos a agregar deben proporcionarse en una lista.' })
  @IsString({ each: true, message: 'Cada permiso a agregar debe ser un texto válido.' })
  @IsOptional()
  add?: string[];

  @ApiPropertyOptional({ example: ['employee:delete'] })
  @IsArray({ message: 'Los permisos a remover deben proporcionarse en una lista.' })
  @IsString({ each: true, message: 'Cada permiso a remover debe ser un texto válido.' })
  @IsOptional()
  remove?: string[];

  @ApiPropertyOptional({ example: ['employee:read', 'employee:create'] })
  @IsArray({ message: 'La lista completa de permisos debe proporcionar un arreglo de cadenas.' })
  @IsString({ each: true, message: 'Cada clave de permiso debe ser un texto válido.' })
  @IsOptional()
  keys?: string[];
}
