import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'clk1234567890' })
  id!: string;

  @ApiProperty({ example: 'John Doe' })
  fullName!: string;

  @ApiProperty({ example: '12345678' })
  document!: string;

  @ApiProperty({ example: 'Engineering' })
  department!: string;

  @ApiProperty({ example: 'Software Engineer' })
  position!: string;

  @ApiProperty({ example: 'tenant_id_123' })
  tenantId!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: true })
  isFirstLogin!: boolean;

  @ApiProperty({
    example: [{ id: 'role1', name: 'Admin' }],
    required: false,
  })
  roles?: { id: string; name: string }[];
}
