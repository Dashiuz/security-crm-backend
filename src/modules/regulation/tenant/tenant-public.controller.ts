import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { TenantService } from './tenant.service';

@ApiTags('Tenant Public')
@Controller('tenants')
export class TenantPublicController {
  constructor(private readonly tenantService: TenantService) {}

  @Get(':id/logo')
  @ApiOperation({
    summary: 'Obtener o visualizar el logotipo corporativo (Público)',
  })
  @ApiOkResponse({
    description:
      'Redirección al recurso de imagen firmado o transmisión directa del archivo',
  })
  @ApiNotFoundResponse({ description: 'Logotipo no encontrado' })
  async getLogo(@Param('id') id: string, @Res() res: Response) {
    const logoResult = await this.tenantService.getLogoStreamOrUrl(id);
    if (!logoResult) {
      throw new NotFoundException('Logotipo no encontrado');
    }

    if (logoResult.type === 'redirect') {
      return res.redirect(logoResult.url);
    }

    if (logoResult.type === 'buffer') {
      res.setHeader('Content-Type', logoResult.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(logoResult.buffer);
    }

    throw new NotFoundException('Logotipo no disponible');
  }
}
