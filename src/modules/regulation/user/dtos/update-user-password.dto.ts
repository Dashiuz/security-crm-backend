import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserPasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '1122334455' })
  document: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'p455w0rd' })
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '4w350m3p455w0rd' })
  newPassword: string;
}
