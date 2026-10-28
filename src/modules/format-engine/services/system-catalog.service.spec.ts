import { Test, TestingModule } from '@nestjs/testing';
import { SystemCatalogService } from './system-catalog.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('SystemCatalogService', () => {
  let service: SystemCatalogService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      tenant: {
        findUnique: jest.fn(),
      },
      tenantProfile: {
        findUnique: jest.fn(),
      },
      tenantDocumentSkin: {
        findFirst: jest.fn(),
      },
      client: {
        findFirst: jest.fn(),
      },
      employee: {
        findFirst: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
      commercialProposal: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemCatalogService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<SystemCatalogService>(SystemCatalogService);
  });

  describe('getSystemCatalog', () => {
    it('should return system catalog categories with fields', () => {
      const catalog = service.getSystemCatalog();
      expect(catalog).toBeInstanceOf(Array);
      expect(catalog.length).toBeGreaterThanOrEqual(5);

      const categoryIds = catalog.map((c) => c.id);
      expect(categoryIds).toContain('TENANT');
      expect(categoryIds).toContain('CLIENT');
      expect(categoryIds).toContain('EMPLOYEE');
      expect(categoryIds).toContain('FINANCE');
      expect(categoryIds).toContain('MEDIA_SECURITY');
      expect(categoryIds).toContain('SYSTEM');

      const allFields = catalog.flatMap((c) => c.fields);
      const imageFields = allFields.filter((f) => f.dataType === 'IMAGE');
      expect(imageFields.length).toBeGreaterThanOrEqual(4);
      expect(imageFields.map((f) => f.token)).toContain('empresa_logo');
      expect(imageFields.map((f) => f.token)).toContain('cliente_logo');
      expect(imageFields.map((f) => f.token)).toContain('empleado_foto');
      expect(imageFields.map((f) => f.token)).toContain('usuario_firma');
    });
  });

  describe('numberToColombianWords', () => {
    it('should return CERO PESOS M/CTE for 0 or NaN or falsy values', () => {
      expect(service.numberToColombianWords(0)).toBe('CERO PESOS M/CTE');
      expect(service.numberToColombianWords(NaN)).toBe('CERO PESOS M/CTE');
      expect(service.numberToColombianWords(null as any)).toBe(
        'CERO PESOS M/CTE',
      );
    });

    it('should convert 1000000 correctly', () => {
      expect(service.numberToColombianWords(1000000)).toBe(
        'UN MILLÓN PESOS M/CTE',
      );
    });

    it('should convert 100 correctly', () => {
      expect(service.numberToColombianWords(100)).toBe('CIEN PESOS M/CTE');
    });

    it('should convert 1000 correctly', () => {
      expect(service.numberToColombianWords(1000)).toBe('MIL PESOS M/CTE');
    });

    it('should convert numbers with tens and units', () => {
      expect(service.numberToColombianWords(25)).toBe(
        'VEINTICINCO PESOS M/CTE',
      );
      expect(service.numberToColombianWords(42)).toBe(
        'CUARENTA Y DOS PESOS M/CTE',
      );
    });

    it('should convert complex amount correctly', () => {
      const result = service.numberToColombianWords(15285000);
      expect(result).toBe(
        'QUINCE MILLONES DOSCIENTOS OCHENTA Y CINCO MIL PESOS M/CTE',
      );
    });
  });

  describe('resolveContextValues', () => {
    const tenantId = 'tenant-uuid-1';

    it('should resolve base system fields and tenant profile & skin', async () => {
      prismaMock.tenantProfile.findUnique.mockResolvedValue({
        legalName: 'Seguridad Total S.A.S.',
        taxId: '900.123.456-7',
        legalRepresentative: 'Juan Valdés',
        city: 'Medellín',
        address: 'Calle 10 # 40-20',
        contactPhone: '3001234567',
      });
      prismaMock.tenantDocumentSkin.findFirst.mockResolvedValue({
        supervigilanciaLicense: 'LIC-SVSP-1234',
        supervigilanciaLicDate: new Date('2024-01-15'),
        supervigilanciaLicExpiry: new Date('2029-01-15'),
        uniformsResolutionNum: 'RES-UNI-001',
        overtimeResolutionNum: 'RES-HOR-002',
      });

      const values = await service.resolveContextValues(tenantId);

      expect(values['año_actual']).toBe(String(new Date().getFullYear()));
      expect(values['empresa_razon_social']).toBe('Seguridad Total S.A.S.');
      expect(values['empresa_nit']).toBe('900.123.456-7');
      expect(values['empresa_licencia_svsp']).toBe('LIC-SVSP-1234');
      expect(values['empresa_res_uniformes']).toBe('RES-UNI-001');
    });

    it('should resolve client data if clientId is provided', async () => {
      prismaMock.tenantProfile.findUnique.mockResolvedValue(null);
      prismaMock.tenantDocumentSkin.findFirst.mockResolvedValue(null);
      prismaMock.client.findFirst.mockResolvedValue({
        id: 'client-1',
        name: 'Edificio Los Rosales',
        nit: '800.999.111-2',
        administrator: 'Ana Gomez',
        address: 'Carrera 7 # 100-20',
        city: 'Bogota',
        stratum: 5,
        email: 'losrosales@gmail.com',
      });

      const values = await service.resolveContextValues(tenantId, {
        clientId: 'client-1',
      });

      expect(values['cliente_nombre']).toBe('Edificio Los Rosales');
      expect(values['cliente_nit']).toBe('800.999.111-2');
      expect(values['cliente_administrador']).toBe('Ana Gomez');
      expect(values['cliente_estrato']).toBe('5');
    });

    it('should resolve employee data if employeeId is provided', async () => {
      prismaMock.tenantProfile.findUnique.mockResolvedValue(null);
      prismaMock.tenantDocumentSkin.findFirst.mockResolvedValue(null);
      prismaMock.employee.findFirst.mockResolvedValue({
        id: 'emp-1',
        fullName: 'Pedro Pérez',
        document: '10203040',
        entryDate: new Date('2023-05-10'),
        positionRef: { name: 'Supervisor Operativo' },
      });

      const values = await service.resolveContextValues(tenantId, {
        employeeId: 'emp-1',
      });

      expect(values['empleado_nombre']).toBe('Pedro Pérez');
      expect(values['empleado_cedula']).toBe('10203040');
      expect(values['empleado_cargo']).toBe('Supervisor Operativo');
      expect(values['empleado_salario']).toContain('2.000.000');
    });

    it('should resolve commercial proposal data if proposalId is provided', async () => {
      prismaMock.tenantProfile.findUnique.mockResolvedValue(null);
      prismaMock.tenantDocumentSkin.findFirst.mockResolvedValue(null);
      prismaMock.commercialProposal.findFirst.mockResolvedValue({
        id: 'prop-1',
        totalMonthlyWithTax: 12500000,
        proposalFolioCode: 'FOL-2026-001',
        contractDurationMonths: 24,
        promptPaymentDays: 15,
        promptPaymentDiscPercent: 2.5,
      });

      const values = await service.resolveContextValues(tenantId, {
        proposalId: 'prop-1',
      });

      expect(values['propuesta_total_mensual']).toContain('12.500.000');
      expect(values['propuesta_codigo_omega']).toBe('FOL-2026-001');
      expect(values['propuesta_meses']).toBe('24');
      expect(values['propuesta_dias_pronto_pago']).toBe('15');
      expect(values['propuesta_descuento_pronto_pago']).toBe('2.5%');
      expect(values['monto_en_letras']).toContain('DOCE MILLONES');
    });

    it('should handle errors gracefully without throwing', async () => {
      prismaMock.tenantProfile.findUnique.mockRejectedValue(
        new Error('DB connection lost'),
      );
      prismaMock.tenantDocumentSkin.findFirst.mockRejectedValue(
        new Error('DB error'),
      );

      const values = await service.resolveContextValues(tenantId);
      expect(values['año_actual']).toBe(String(new Date().getFullYear()));
    });
  });
});
