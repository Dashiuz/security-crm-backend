import { ClientStructureGeneratorService } from './client-structure-generator.service';
import { ResidentialComplexType } from '@prisma/client';

describe('ClientStructureGeneratorService - SPEC-ADM-005 Tower ID Injection', () => {
  let service: ClientStructureGeneratorService;
  let mockPrisma: any;
  let createdClientPropertiesData: any;

  beforeEach(() => {
    createdClientPropertiesData = null;

    const mockTx = {
      unit: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }), createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      floor: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }), create: jest.fn().mockResolvedValue({ id: 'floor-1' }) },
      tower: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: `tower-id-${data.towerName}`, ...data })),
      },
      clientProperties: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockImplementation(({ data }) => {
          createdClientPropertiesData = data;
          return Promise.resolve({ id: 'props-1', ...data });
        }),
      },
    };

    mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(mockTx)),
    };

    service = new ClientStructureGeneratorService(mockPrisma);
  });

  it('should inject tower.id into structureConfig.towers for BUILDING_CLUSTER', async () => {
    const config: any = {
      structureType: ResidentialComplexType.BUILDING_CLUSTER,
      towers: [
        {
          towerName: 'Torre 1',
          floorsAmount: 2,
          apartmentsPerFloor: 2,
          elevators: 1,
        },
        {
          towerName: 'Torre 2',
          floorsAmount: 2,
          apartmentsPerFloor: 2,
          elevators: 1,
        },
      ],
    };

    await service.generateStructure('client-1', 'tenant-1', config, 'user-1');

    expect(createdClientPropertiesData).toBeDefined();
    const savedConfig = createdClientPropertiesData.structureConfig;
    expect(savedConfig.towers).toHaveLength(2);
    expect(savedConfig.towers[0].id).toBe('tower-id-Torre 1');
    expect(savedConfig.towers[1].id).toBe('tower-id-Torre 2');
  });

  it('should inject tower.id into structureConfig.towers for SINGLE_BUILDING', async () => {
    const config: any = {
      structureType: ResidentialComplexType.SINGLE_BUILDING,
      floorsAmount: 3,
      apartmentsPerFloor: 2,
    };

    await service.generateStructure('client-1', 'tenant-1', config, 'user-1');

    expect(createdClientPropertiesData).toBeDefined();
    const savedConfig = createdClientPropertiesData.structureConfig;
    expect(savedConfig.towers).toHaveLength(1);
    expect(savedConfig.towers[0].id).toBe('tower-id-Edificio Principal');
  });
});
