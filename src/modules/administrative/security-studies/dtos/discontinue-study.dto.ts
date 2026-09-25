import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DiscontinueStudyDto {
  @ApiProperty({
    description: 'Palabra de confirmación obligatoria: "acepto"',
    example: 'acepto',
  })
  @IsString()
  @IsNotEmpty()
  confirmation: string;
}
