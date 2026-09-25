import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UpdateCanvasDto {
  @ApiProperty({
    description: 'Estado serializado de las capas y nodos vectoriales de Konva.js',
  })
  @IsNotEmpty()
  canvasState: any;
}
