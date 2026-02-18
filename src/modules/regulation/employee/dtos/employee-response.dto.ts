import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmployeeResponseDto {
  @ApiProperty({ example: 'aioaybigrz5eswn62ttlsibk' })
  id!: string;

  @ApiProperty({ example: 'aioaybigrz5eswn62ttlsibk' })
  tenantId!: string;

  @ApiProperty({ example: 'Juan Perez' })
  fullName!: string;

  @ApiProperty({ example: 'CC' })
  documentType!: string;

  @ApiProperty({ example: '1122334455' })
  document!: string;

  @ApiProperty({ example: 'M' })
  gender!: string;

  @ApiPropertyOptional({ nullable: true, example: 'juan.perez@example.com' })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '555-1234' })
  phone!: string | null;

  // If you use @db.Date, in JS it still comes as Date. Expose as ISO date string.
  @ApiProperty({ example: '1966-12-28' })
  birthdate!: string;

  @ApiProperty({ example: '2006-12-01' })
  entryDate!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ nullable: true, example: 'Operaciones' })
  departmentName!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Supervisor Motorizado' })
  positionName!: string | null;
}
