import { ApiProperty } from '@nestjs/swagger';

export class RolePermissionResponseDto {
  @ApiProperty({ example: 'employee:read' })
  key!: string;

  @ApiProperty({ example: 'Read employee data', required: false })
  desc?: string | null;
}

export class RoleResponseDto {
  @ApiProperty({ example: 'clk1234567890' })
  id!: string;

  @ApiProperty({ example: 'Admin' })
  name!: string;

  @ApiProperty({ example: 'tenant_id_123' })
  tenantId?: string;

  @ApiProperty({ type: [RolePermissionResponseDto], required: false })
  permissions?: RolePermissionResponseDto[];
}
