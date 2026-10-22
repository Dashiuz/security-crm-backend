import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SignatureCreationMode } from '@prisma/client';

export class SubmitPublicSignatureDto {
  @ApiProperty({
    description: 'DataURL base64 de la firma estampada por el cliente',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^data:image\/(png|svg\+xml);base64,/, {
    message:
      'La firma debe ser una imagen válida en formato DataURL base64 (PNG o SVG)',
  })
  signatureDataUrl: string;

  @ApiProperty({
    enum: SignatureCreationMode,
    description: 'Método utilizado para firmar: DRAW, TYPE o UPLOAD',
    example: SignatureCreationMode.DRAW,
  })
  @IsEnum(SignatureCreationMode)
  method: SignatureCreationMode;

  @ApiProperty({
    description:
      'Aceptación expresa de términos y condiciones de firma electrónica (Ley 527 de 1999)',
    example: true,
  })
  @IsBoolean()
  acceptedTerms: boolean;
}
