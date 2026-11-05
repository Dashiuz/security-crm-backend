import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { UniversalCodesService } from '../services/universal-codes.service';
import { UniversalCodeResponseDto } from '../dtos/universal-code.dto';

@ApiTags('Público: Verificación de Códigos')
@Controller('public/universal-codes')
export class PublicUniversalCodesController {
  constructor(private readonly service: UniversalCodesService) {}

  @Get('verify/:code')
  @ApiOperation({
    summary:
      'Verificación pública de un código universal por escaneo móvil (sin autenticación)',
  })
  @ApiOkResponse({
    description: 'Ficha pública de verificación del código y entidad asociada',
    type: UniversalCodeResponseDto,
  })
  verify(@Param('code') code: string) {
    return this.service.resolveCode(code, undefined);
  }
}
