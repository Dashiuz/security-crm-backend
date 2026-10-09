import { Test, TestingModule } from '@nestjs/testing';
import { MinutaGeneralService } from './minuta-general.service';
import { MinutaRepositoryService } from '../../../../common/repository/minuta/minuta/minuta.repository.service';

describe('MinutaGeneralService', () => {
  let service: MinutaGeneralService;
  let repository: any;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinutaGeneralService,
        { provide: MinutaRepositoryService, useValue: repository },
      ],
    }).compile();

    service = module.get<MinutaGeneralService>(MinutaGeneralService);
  });

  describe('findAll', () => {
    it('debe retornar lista completa envuelta en envelope cuando no se envía paginación', async () => {
      const mockRows = [{ id: 'minuta-1' }, { id: 'minuta-2' }];
      repository.findMany.mockResolvedValue(mockRows);

      const result = await service.findAll({});

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: null,
        }),
        expect.objectContaining({
          cursor: undefined,
          take: undefined,
        }),
      );
      expect(result.data).toEqual(mockRows);
      expect(result.meta.nextCursor).toBeNull();
    });

    it('debe aplicar paginación por cursor y retornar nextCursor cuando data.length === take', async () => {
      const mockRows = [{ id: 'minuta-1' }, { id: 'minuta-2' }];
      repository.findMany.mockResolvedValue(mockRows);

      const result = await service.findAll({
        cursor: 'minuta-prev',
        take: 2,
      });

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: null,
        }),
        {
          cursor: 'minuta-prev',
          take: 2,
          skip: 1,
        },
      );
      expect(result.data).toEqual(mockRows);
      expect(result.meta.nextCursor).toBe('minuta-2');
    });

    it('debe retornar nextCursor null cuando hay menos registros que take', async () => {
      const mockRows = [{ id: 'minuta-1' }];
      repository.findMany.mockResolvedValue(mockRows);

      const result = await service.findAll({
        take: 5,
      });

      expect(result.data).toEqual(mockRows);
      expect(result.meta.nextCursor).toBeNull();
    });
  });
});
