import { ApiProperty } from '@nestjs/swagger';

export class TenantResponseDto {
  @ApiProperty({ example: 'clk1234567890' })
  id!: string;

  @ApiProperty({ example: 'My Customer Tenant' })
  name!: string;

  @ApiProperty({ example: 'customer-slug' })
  slug!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
