import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UpdateFileCanvasDto {
  @ApiProperty({
    description:
      'Estado serializado de anotaciones, trazos y nodos vectoriales de Konva.js para la fotografía adjunta',
  })
  @IsNotEmpty()
  canvasState: any;
}
