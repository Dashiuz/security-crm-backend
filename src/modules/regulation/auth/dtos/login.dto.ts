import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '1122334455' })
  document!: string;

  @ApiProperty({ example: 'P@ssw0rd123' })
  password!: string;
}
