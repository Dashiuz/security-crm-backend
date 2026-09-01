import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ example: 'clk1234567890' })
  id!: string;

  @ApiProperty({ example: 'permission:key' })
  key!: string;

  @ApiProperty({ example: 'Description of the permission', required: false })
  desc?: string | null;
}
