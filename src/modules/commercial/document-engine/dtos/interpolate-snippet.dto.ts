import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InterpolateSnippetDto {
  @ApiPropertyOptional({
    description: 'Plantilla explícita para interpolar. Si no se provee, se usa la guardada en BD.',
  })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiProperty({
    description: 'Diccionario clave-valor con las variables para interpolar',
    example: {
      nombre_cliente: 'Conjunto Residencial Altos de la Colina',
      nit: '901.442.128-4',
      canon_mensual: '$ 18.500.000',
    },
  })
  @IsNotEmpty()
  @IsObject()
  variables: Record<string, any>;
}
