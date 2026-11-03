import { Test, TestingModule } from '@nestjs/testing';
import { PayrollConceptsController } from './payroll-concepts.controller';
import { PayrollConceptsService } from '../services/payroll-concepts.service';
import {
  PayrollConceptNature,
  PayrollProportionality,
  ShiftModalityClass,
} from '@prisma/client';

describe('PayrollConceptsController', () => {
  let controller: PayrollConceptsController;
  let service: any;

  const mockReq = {
    user: {
      tenantId: 'tenant-1',
      id: 'user-1',
      sub: 'user-1',
    },
  };

  beforeEach(async () => {
    service = {
      listConcepts: jest.fn().mockResolvedValue([{ id: 'c-1', code: 1 }]),
      getConceptById: jest.fn().mockResolvedValue({ id: 'c-1', code: 1 }),
      createConcept: jest.fn().mockResolvedValue({ id: 'c-1', code: 1 }),
      updateConcept: jest.fn().mockResolvedValue({ id: 'c-1', code: 1 }),
      deleteConcept: jest
        .fn()
        .mockResolvedValue({ id: 'c-1', isActive: false }),
      updateBaseMatrix: jest
        .fn()
        .mockResolvedValue({ success: true, count: 2 }),
      listModalities: jest.fn().mockResolvedValue([{ id: 'm-1', code: 1 }]),
      getModalityById: jest.fn().mockResolvedValue({ id: 'm-1', code: 1 }),
      createModality: jest.fn().mockResolvedValue({ id: 'm-1', code: 1 }),
      updateModality: jest.fn().mockResolvedValue({ id: 'm-1', code: 1 }),
      deleteModality: jest
        .fn()
        .mockResolvedValue({ id: 'm-1', isActive: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollConceptsController],
      providers: [{ provide: PayrollConceptsService, useValue: service }],
    }).compile();

    controller = module.get<PayrollConceptsController>(
      PayrollConceptsController,
    );
  });

  it('should list concepts with query filters', async () => {
    const res = await controller.listConcepts(
      mockReq,
      PayrollConceptNature.DEVENGO,
      'true',
      'sueldo',
    );
    expect(res).toBeDefined();
    expect(service.listConcepts).toHaveBeenCalledWith('tenant-1', {
      nature: PayrollConceptNature.DEVENGO,
      isActive: true,
      search: 'sueldo',
    });
  });

  it('should create concept', async () => {
    const dto = {
      code: 1,
      name: 'BASICO',
      nature: PayrollConceptNature.DEVENGO,
      proportionality: PayrollProportionality.DAYS,
    };
    const res = await controller.createConcept(mockReq, dto);
    expect(res).toBeDefined();
    expect(service.createConcept).toHaveBeenCalledWith(
      'tenant-1',
      dto,
      'user-1',
    );
  });

  it('should update base matrix in bulk', async () => {
    const matrix = [{ conceptId: 'c-1', inLiq: true }];
    const res = await controller.updateBaseMatrix(mockReq, matrix);
    expect(res).toBeDefined();
    expect(service.updateBaseMatrix).toHaveBeenCalledWith(
      'tenant-1',
      matrix,
      'user-1',
    );
  });

  it('should manage shift modalities', async () => {
    const modalities = await controller.listModalities(mockReq);
    expect(modalities).toBeDefined();

    const modalityDto = {
      code: 1,
      name: '24H',
      shiftClass: ShiftModalityClass.ROTATING,
    };
    const created = await controller.createModality(mockReq, modalityDto);
    expect(created).toBeDefined();
  });
});
