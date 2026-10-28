import { Test, TestingModule } from '@nestjs/testing';
import { FormatInterpolationService } from './format-interpolation.service';

describe('FormatInterpolationService', () => {
  let service: FormatInterpolationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FormatInterpolationService],
    }).compile();

    service = module.get<FormatInterpolationService>(
      FormatInterpolationService,
    );
  });

  describe('extractVariables', () => {
    it('should return empty array if template is empty or null', () => {
      expect(service.extractVariables('')).toEqual([]);
      expect(service.extractVariables(null as any)).toEqual([]);
    });

    it('should extract unique variable tokens with dot notation and underscores', () => {
      const template =
        'Hola {{cliente.nombre_completo}}, su documento es {{cliente.nit}} en la fecha {{sistema.fecha_actual}} y de nuevo {{cliente.nombre_completo}}.';
      const result = service.extractVariables(template);
      expect(result).toHaveLength(3);
      expect(result).toContain('cliente.nombre_completo');
      expect(result).toContain('cliente.nit');
      expect(result).toContain('sistema.fecha_actual');
    });
  });

  describe('interpolate', () => {
    it('should return empty result if template is empty or null', () => {
      const result = service.interpolate('', { any: 'val' });
      expect(result.interpolatedContent).toBe('');
      expect(result.substitutedVariables).toEqual([]);
      expect(result.missingVariables).toEqual([]);
    });

    it('should replace matched variables and track substituted and missing ones', () => {
      const template =
        'Estimado/a {{cliente.nombre}}, su saldo es {{cuenta.saldo}} y su código es {{CODIGO_PERSONAL}}.';
      const values = {
        'cliente.nombre': 'Carlos Mendoza',
        codigo_personal: 'SEC-999',
      };

      const result = service.interpolate(template, values);

      expect(result.interpolatedContent).toBe(
        'Estimado/a Carlos Mendoza, su saldo es {{cuenta.saldo}} y su código es SEC-999.',
      );
      expect(result.substitutedVariables).toContain('cliente.nombre');
      expect(result.substitutedVariables).toContain('CODIGO_PERSONAL');
      expect(result.missingVariables).toContain('cuenta.saldo');
    });

    it('should handle numeric values correctly without format corruption', () => {
      const template = 'Valor total: ${{total.pesos}} COP';
      const values = {
        'total.pesos': 1500000,
      };

      const result = service.interpolate(template, values);
      expect(result.interpolatedContent).toBe('Valor total: $1500000 COP');
      expect(result.substitutedVariables).toEqual(['total.pesos']);
    });
  });
});
