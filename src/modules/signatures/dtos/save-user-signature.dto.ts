import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SignatureCreationMode } from '@prisma/client';

export class SaveUserSignatureDto {
  @ApiProperty({
    description: 'Data URL base64 de la firma en formato PNG o SVG',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^data:image\/(png|svg\+xml);base64,/, {
    message: 'La firma debe ser una imagen válida en formato DataURL base64 (PNG o SVG)',
  })
  signatureDataUrl: string;

  @ApiProperty({
    enum: SignatureCreationMode,
    description: 'Método de creación de la firma: DRAW, TYPE o UPLOAD',
    example: SignatureCreationMode.DRAW,
  })
  @IsEnum(SignatureCreationMode, {
    message: 'El método debe ser DRAW, TYPE o UPLOAD',
  })
  method: SignatureCreationMode;
}
