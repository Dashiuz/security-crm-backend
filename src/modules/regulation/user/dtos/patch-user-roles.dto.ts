import { ApiPropertyOptional } from '@nestjs/swagger';

export class PatchUserRolesDto {
  @ApiPropertyOptional({ example: ['rol_cuid_1', 'rol_cuid_2'] })
  addRoleIds?: string[];

  @ApiPropertyOptional({ example: ['rol_cuid_3'] })
  removeRoleIds?: string[];
}
