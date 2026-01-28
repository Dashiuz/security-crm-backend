import { ApiProperty } from '@nestjs/swagger';

export class DeletedEmployeeDto {
  @ApiProperty({ example: 'aioaybigrz5eswn62ttlsibk' })
  id!: string;

  @ApiProperty({ example: 'aioaybigrz5eswn62ttlsibk' })
  tenantId!: string;

  @ApiProperty({ example: 'Juan Perez' })
  fullName!: string;

  @ApiProperty({ example: '1122334455' })
  document!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-01-27T14:19:35.000Z' })
  updatedAt!: Date;

  @ApiProperty({ example: '2026-01-27T14:19:35.000Z', nullable: true })
  deletedAt!: Date | null;
}
