import { Test, TestingModule } from '@nestjs/testing';
import { PayrollEmployeesController } from './payroll-employees.controller';
import { PayrollEmployeesService } from '../services/payroll-employees.service';

describe('PayrollEmployeesController', () => {
  let controller: PayrollEmployeesController;
  let service: jest.Mocked<PayrollEmployeesService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<PayrollEmployeesService>> = {
      findEmployees: jest.fn(),
      getKpis: jest.fn(),
      exportRenovaExcel: jest.fn(),
      getEmployeeDossier: jest.fn(),
      upsertPayrollProfile: jest.fn(),
      addFamilyMember: jest.fn(),
      deleteFamilyMember: jest.fn(),
      updateRequirementCheck: jest.fn(),
      addSvspCourse: jest.fn(),
      deleteSvspCourse: jest.fn(),
      addInternalTraining: jest.fn(),
      deleteInternalTraining: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollEmployeesController],
      providers: [{ provide: PayrollEmployeesService, useValue: mockService }],
    }).compile();

    controller = module.get<PayrollEmployeesController>(
      PayrollEmployeesController,
    );
    service = module.get(PayrollEmployeesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const mockReq = {
    user: { tenantId: 'tenant-1', sub: 'user-1' },
  };

  it('should return employees list from service', async () => {
    service.findEmployees.mockResolvedValue([{ id: 'emp-1' }] as any);
    const res = await controller.findEmployees(mockReq, {});
    expect(res).toEqual([{ id: 'emp-1' }]);
    expect(service.findEmployees).toHaveBeenCalledWith('tenant-1', {});
  });

  it('should return kpis from service', async () => {
    service.getKpis.mockResolvedValue({ totalActiveEmployees: 5 } as any);
    const res = await controller.getKpis(mockReq);
    expect(res).toEqual({ totalActiveEmployees: 5 });
    expect(service.getKpis).toHaveBeenCalledWith('tenant-1');
  });

  it('should stream exportRenovaExcel buffer with correct attachment header', async () => {
    const fakeBuffer = Buffer.from('excel-bytes');
    service.exportRenovaExcel.mockResolvedValue(fakeBuffer);

    const mockRes = {
      setHeader: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await controller.exportRenovaExcel(mockReq, mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('attachment; filename="RENOVA_SUPERVIGILANCIA_'),
    );
    expect(mockRes.send).toHaveBeenCalledWith(fakeBuffer);
  });

  it('should return employee dossier from service', async () => {
    service.getEmployeeDossier.mockResolvedValue({
      employee: { id: 'emp-1' },
    } as any);
    const res = await controller.getEmployeeDossier(mockReq, 'emp-1');
    expect(res).toEqual({ employee: { id: 'emp-1' } });
    expect(service.getEmployeeDossier).toHaveBeenCalledWith(
      'tenant-1',
      'emp-1',
    );
  });

  it('should upsert profile from service', async () => {
    service.upsertPayrollProfile.mockResolvedValue({ id: 'prof-1' } as any);
    const res = await controller.upsertPayrollProfile(mockReq, 'emp-1', {
      customBaseSalary: 1800000,
    });
    expect(res).toEqual({ id: 'prof-1' });
    expect(service.upsertPayrollProfile).toHaveBeenCalledWith(
      'tenant-1',
      'emp-1',
      { customBaseSalary: 1800000 },
    );
  });

  it('should handle family members operations', async () => {
    service.addFamilyMember.mockResolvedValue({ id: 'fam-1' } as any);
    service.deleteFamilyMember.mockResolvedValue({ id: 'fam-1' } as any);

    await controller.addFamilyMember(mockReq, 'emp-1', {
      fullName: 'Hijo',
      relationship: 'CHILD' as any,
    });
    await controller.deleteFamilyMember(mockReq, 'fam-1');

    expect(service.addFamilyMember).toHaveBeenCalled();
    expect(service.deleteFamilyMember).toHaveBeenCalledWith(
      'tenant-1',
      'fam-1',
    );
  });

  it('should update requirement check', async () => {
    service.updateRequirementCheck.mockResolvedValue({ id: 'chk-1' } as any);
    await controller.updateRequirementCheck(mockReq, 'emp-1', 'req-1', {
      status: 'VERIFIED' as any,
    });
    expect(service.updateRequirementCheck).toHaveBeenCalledWith(
      'tenant-1',
      'emp-1',
      'req-1',
      { status: 'VERIFIED' },
    );
  });

  it('should handle svsp course operations', async () => {
    service.addSvspCourse.mockResolvedValue({ id: 'svsp-1' } as any);
    service.deleteSvspCourse.mockResolvedValue({ id: 'svsp-1' } as any);

    await controller.addSvspCourse(mockReq, 'emp-1', {
      svspLevelId: 'lvl-1',
      academyId: 'acad-1',
      nroCode: 'NRO-1',
      issueDate: '2026-01-01',
    });
    await controller.deleteSvspCourse(mockReq, 'svsp-1');

    expect(service.addSvspCourse).toHaveBeenCalled();
    expect(service.deleteSvspCourse).toHaveBeenCalledWith('tenant-1', 'svsp-1');
  });

  it('should handle training operations', async () => {
    service.addInternalTraining.mockResolvedValue({ id: 'train-1' } as any);
    service.deleteInternalTraining.mockResolvedValue({ id: 'train-1' } as any);

    await controller.addInternalTraining(mockReq, 'emp-1', {
      title: 'Tiro',
      topic: 'Armas',
      instructorName: 'Instructor',
      trainingDate: '2026-01-01',
    });
    await controller.deleteInternalTraining(mockReq, 'train-1');

    expect(service.addInternalTraining).toHaveBeenCalled();
    expect(service.deleteInternalTraining).toHaveBeenCalledWith(
      'tenant-1',
      'train-1',
    );
  });
});
