import { ApiPropertyOptional } from '@nestjs/swagger';

export class PatchRolePermissionsDto {
  @ApiPropertyOptional({ example: ['employee:read', 'employee:create'] })
  add?: string[];

  @ApiPropertyOptional({ example: ['employee:delete'] })
  remove?: string[];

  @ApiPropertyOptional({ example: ['employee:read', 'employee:create'] })
  keys?: string[];
}
