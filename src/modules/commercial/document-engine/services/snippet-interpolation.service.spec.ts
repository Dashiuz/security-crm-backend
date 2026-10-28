import { SnippetInterpolationService } from './snippet-interpolation.service';

describe('SnippetInterpolationService', () => {
  let service: SnippetInterpolationService;

  beforeEach(() => {
    service = new SnippetInterpolationService();
  });

  describe('extractVariables', () => {
    it('debe extraer las variables únicas encerradas en {{variable}}', () => {
      const template =
        'Hola {{nombre_cliente}}, su NIT es {{nit}} y su canon es {{canon_mensual}}. Gracias {{nombre_cliente}}!';
      const variables = service.extractVariables(template);

      expect(variables).toEqual(['nombre_cliente', 'nit', 'canon_mensual']);
    });

    it('debe manejar plantillas vacías o nulas retornando arreglo vacío', () => {
      expect(service.extractVariables('')).toEqual([]);
      expect(service.extractVariables(null as any)).toEqual([]);
    });

    it('debe ignorar espacios en blanco dentro de los corchetes {{  var  }}', () => {
      const template =
        'Estimado {{  cliente  }}, código {{  codigo_servicio  }}';
      const variables = service.extractVariables(template);

      expect(variables).toEqual(['cliente', 'codigo_servicio']);
    });
  });

  describe('interpolate', () => {
    it('debe sustituir las variables presentes en el diccionario', () => {
      const template = 'Propuesta para {{cliente}} con valor {{valor}}';
      const values = { cliente: 'Edificio Titanium', valor: '$ 12.000.000' };

      const result = service.interpolate(template, values);

      expect(result.interpolatedContent).toBe(
        'Propuesta para Edificio Titanium con valor $ 12.000.000',
      );
      expect(result.substitutedVariables).toEqual(['cliente', 'valor']);
      expect(result.missingVariables).toEqual([]);
    });

    it('debe reportar variables faltantes cuando no se encuentran en el diccionario', () => {
      const template =
        'Contrato con {{cliente}}, NIT {{nit}}, teléfono {{telefono}}';
      const values = { cliente: 'ACME Corp' };

      const result = service.interpolate(template, values);

      expect(result.interpolatedContent).toBe(
        'Contrato con ACME Corp, NIT {{nit}}, teléfono {{telefono}}',
      );
      expect(result.substitutedVariables).toEqual(['cliente']);
      expect(result.missingVariables).toEqual(['nit', 'telefono']);
    });

    it('debe retornar objeto vacío si la plantilla es vacía', () => {
      const result = service.interpolate('', { cliente: 'Test' });
      expect(result.interpolatedContent).toBe('');
      expect(result.substitutedVariables).toEqual([]);
      expect(result.missingVariables).toEqual([]);
    });
  });

  describe('validateTemplate', () => {
    it('debe validar exitosamente cuando todas las variables son permitidas', () => {
      const template = 'Carta para {{nombre}} con NIT {{nit}}';
      const allowed = ['nombre', 'nit', 'direccion'];

      const result = service.validateTemplate(template, allowed);

      expect(result.isValid).toBe(true);
      expect(result.unallowed).toEqual([]);
      expect(result.found).toEqual(['nombre', 'nit']);
    });

    it('debe detectar variables no permitidas', () => {
      const template = 'Carta para {{nombre}} con clave secreta {{password}}';
      const allowed = ['nombre', 'nit'];

      const result = service.validateTemplate(template, allowed);

      expect(result.isValid).toBe(false);
      expect(result.unallowed).toEqual(['password']);
    });

    it('debe permitir cualquier variable si allowedVariables está vacío', () => {
      const template = 'Texto con {{var1}} y {{var2}}';
      const result = service.validateTemplate(template, []);

      expect(result.isValid).toBe(true);
      expect(result.unallowed).toEqual([]);
      expect(result.found).toEqual(['var1', 'var2']);
    });
  });
});
