import { Test, TestingModule } from '@nestjs/testing';
import { PayrollEmployeesService } from './payroll-employees.service';
import { PayrollEmployeesRepository } from '../repositories/payroll-employees.repository';
import { RenovaExcelExporterService } from './renova-excel-exporter.service';

describe('PayrollEmployeesService', () => {
  let service: PayrollEmployeesService;
  let repository: jest.Mocked<PayrollEmployeesRepository>;
  let renovaExporter: jest.Mocked<RenovaExcelExporterService>;

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<PayrollEmployeesRepository>> = {
      findEmployeesWithPayroll: jest.fn(),
      findEmployeeDossier: jest.fn(),
      upsertPayrollProfile: jest.fn(),
      createFamilyMember: jest.fn(),
      deleteFamilyMember: jest.fn(),
      updateRequirementCheck: jest.fn(),
      createSvspCourse: jest.fn(),
      deleteSvspCourse: jest.fn(),
      createInternalTraining: jest.fn(),
      deleteInternalTraining: jest.fn(),
      findDataForRenovaExport: jest.fn(),
    };

    const mockExporter: Partial<jest.Mocked<RenovaExcelExporterService>> = {
      generateRenovaExcelBuffer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollEmployeesService,
        { provide: PayrollEmployeesRepository, useValue: mockRepo },
        { provide: RenovaExcelExporterService, useValue: mockExporter },
      ],
    }).compile();

    service = module.get<PayrollEmployeesService>(PayrollEmployeesService);
    repository = module.get(PayrollEmployeesRepository);
    renovaExporter = module.get(RenovaExcelExporterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findEmployees and Traffic Lights', () => {
    it('should enrich employees with SVSP status, contract alerts and folder completion', async () => {
      const today = new Date();
      const validDate = new Date(today.getTime());
      validDate.setDate(validDate.getDate() + 90); // 90 días en el futuro -> VALID

      const expiringDate = new Date(today.getTime());
      expiringDate.setDate(expiringDate.getDate() + 15); // 15 días en el futuro -> EXPIRING_SOON

      const expiredDate = new Date(today.getTime());
      expiredDate.setDate(expiredDate.getDate() - 10); // Vencido hace 10 días -> EXPIRED

      const contractPreaviso = new Date(today.getTime());
      contractPreaviso.setDate(contractPreaviso.getDate() + 20); // 20 días para fin de contrato -> PREAVISO_REQUIRED

      const mockEmployees = [
        {
          id: 'emp-1',
          fullName: 'Carlos Sanchez',
          firstName: 'Carlos',
          secondName: null,
          lastName: 'Sanchez',
          maternalSurname: null,
          documentType: 'CC',
          document: '10101',
          email: 'carlos@test.com',
          phone: '3001234567',
          entryDate: new Date('2024-01-01'),
          isActive: true,
          isRetired: false,
          payrollProfile: {
            contractType: 'FIXED_TERM',
            contractEndDate: contractPreaviso,
            isBlockedForRehire: false,
          },
          svspCourses: [{ expiryDate: validDate, isCurrent: true }],
          requirementChecks: [
            { requirement: { isMandatory: true }, status: 'VERIFIED' },
            { requirement: { isMandatory: true }, status: 'PENDING' },
          ],
        },
        {
          id: 'emp-2',
          fullName: 'Pedro Diaz',
          firstName: 'Pedro',
          lastName: 'Diaz',
          documentType: 'CC',
          document: '10102',
          entryDate: new Date('2023-05-01'),
          isActive: true,
          isRetired: false,
          payrollProfile: null,
          svspCourses: [{ expiryDate: expiringDate, isCurrent: true }],
          requirementChecks: [],
        },
        {
          id: 'emp-3',
          fullName: 'Juan Mora',
          firstName: 'Juan',
          lastName: 'Mora',
          documentType: 'CC',
          document: '10103',
          entryDate: new Date('2022-01-01'),
          isActive: true,
          isRetired: false,
          payrollProfile: null,
          svspCourses: [{ expiryDate: expiredDate, isCurrent: true }],
          requirementChecks: [],
        },
        {
          id: 'emp-4',
          fullName: 'Sin Curso',
          firstName: 'Sin',
          lastName: 'Curso',
          documentType: 'CC',
          document: '10104',
          entryDate: new Date('2025-01-01'),
          isActive: true,
          isRetired: false,
          payrollProfile: null,
          svspCourses: [],
          requirementChecks: [],
        },
      ];

      repository.findEmployeesWithPayroll.mockResolvedValue(
        mockEmployees as any,
      );

      const result = await service.findEmployees('tenant-1', {});

      expect(result).toHaveLength(4);

      // Emp 1: VALID, PREAVISO_REQUIRED, 50% completion
      expect(result[0].svspStatus).toBe('VALID');
      expect(result[0].contractAlertStatus).toBe('PREAVISO_REQUIRED');
      expect(result[0].folderCompletionPct).toBe(50);

      // Emp 2: EXPIRING_SOON
      expect(result[1].svspStatus).toBe('EXPIRING_SOON');

      // Emp 3: EXPIRED
      expect(result[2].svspStatus).toBe('EXPIRED');

      // Emp 4: MISSING
      expect(result[3].svspStatus).toBe('MISSING');
      expect(result[3].svspDaysRemaining).toBeNull();
    });

    it('should filter by svspStatus if requested', async () => {
      const today = new Date();
      const validDate = new Date(today.getTime());
      validDate.setDate(validDate.getDate() + 50);

      repository.findEmployeesWithPayroll.mockResolvedValue([
        {
          id: 'emp-1',
          fullName: 'Valido',
          documentType: 'CC',
          document: '111',
          isActive: true,
          svspCourses: [{ expiryDate: validDate, isCurrent: true }],
        },
        {
          id: 'emp-2',
          fullName: 'Sin Curso',
          documentType: 'CC',
          document: '222',
          isActive: true,
          svspCourses: [],
        },
      ] as any);

      const result = await service.findEmployees('tenant-1', {
        svspStatus: 'VALID',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-1');
    });
  });

  describe('getKpis', () => {
    it('should aggregate KPI counts correctly', async () => {
      jest.spyOn(service, 'findEmployees').mockResolvedValue([
        {
          id: 'emp-1',
          svspStatus: 'VALID',
          contractAlertStatus: 'OK',
          folderCompletionPct: 100,
        } as any,
        {
          id: 'emp-2',
          svspStatus: 'EXPIRING_SOON',
          contractAlertStatus: 'PREAVISO_REQUIRED',
          folderCompletionPct: 60,
        } as any,
        {
          id: 'emp-3',
          svspStatus: 'EXPIRED',
          contractAlertStatus: 'OK',
          folderCompletionPct: 80,
        } as any,
      ]);

      const kpis = await service.getKpis('tenant-1');
      expect(kpis.totalActiveEmployees).toBe(3);
      expect(kpis.svspValidCount).toBe(1);
      expect(kpis.svspAlertCount).toBe(2); // 1 expiring + 1 expired
      expect(kpis.contractsExpiringSoonCount).toBe(1);
      expect(kpis.incompleteFoldersCount).toBe(2);
    });
  });

  describe('getEmployeeDossier', () => {
    it('should return complete 360 dossier with merged requirement matrix', async () => {
      const mockDossier = {
        employee: {
          id: 'emp-1',
          fullName: 'Andres Bello',
          document: '12345',
          departmentRef: { name: 'OPERACIONES' },
          positionRef: { name: 'GUARDA DE SEGURIDAD' },
          payrollProfile: { customBaseSalary: 1800000 },
          familyMembers: [{ id: 'fam-1', fullName: 'Hijo 1' }],
          requirementChecks: [{ requirementId: 'req-1', status: 'VERIFIED' }],
          svspCourses: [
            {
              id: 'course-1',
              isCurrent: true,
              expiryDate: new Date('2027-01-01'),
            },
          ],
          internalTrainings: [{ id: 'train-1', title: 'Curso 1' }],
        },
        allRequirements: [
          {
            id: 'req-1',
            code: 1,
            name: 'Cédula',
            isMandatory: true,
            hasExpiry: false,
          },
          {
            id: 'req-2',
            code: 2,
            name: 'Examen Médico',
            isMandatory: true,
            hasExpiry: true,
          },
        ],
      };

      repository.findEmployeeDossier.mockResolvedValue(mockDossier as any);

      const dossier = await service.getEmployeeDossier('tenant-1', 'emp-1');

      expect(dossier.employee.fullName).toBe('Andres Bello');
      expect(dossier.requirementMatrix).toHaveLength(2);
      expect(dossier.requirementMatrix[0].status).toBe('VERIFIED');
      expect(dossier.requirementMatrix[1].status).toBe('PENDING'); // Auto-completado como PENDING
      expect(dossier.svspStatus).toBe('VALID');
    });
  });

  describe('CRUD operations', () => {
    it('should delegate upsertPayrollProfile to repository', async () => {
      repository.upsertPayrollProfile.mockResolvedValue({
        id: 'prof-1',
      } as any);
      const res = await service.upsertPayrollProfile('tenant-1', 'emp-1', {
        customBaseSalary: 2000000,
      });
      expect(res).toEqual({ id: 'prof-1' });
      expect(repository.upsertPayrollProfile).toHaveBeenCalledWith(
        'tenant-1',
        'emp-1',
        { customBaseSalary: 2000000 },
      );
    });

    it('should delegate family member create and delete', async () => {
      repository.createFamilyMember.mockResolvedValue({ id: 'fam-1' } as any);
      repository.deleteFamilyMember.mockResolvedValue({ id: 'fam-1' } as any);

      await service.addFamilyMember('tenant-1', 'emp-1', {
        fullName: 'Esposa',
        relationship: 'SPOUSE' as any,
      });
      await service.deleteFamilyMember('tenant-1', 'fam-1');

      expect(repository.createFamilyMember).toHaveBeenCalled();
      expect(repository.deleteFamilyMember).toHaveBeenCalledWith(
        'tenant-1',
        'fam-1',
      );
    });

    it('should delegate requirement check updates', async () => {
      repository.updateRequirementCheck.mockResolvedValue({
        id: 'chk-1',
      } as any);
      await service.updateRequirementCheck('tenant-1', 'emp-1', 'req-1', {
        status: 'VERIFIED' as any,
      });
      expect(repository.updateRequirementCheck).toHaveBeenCalledWith(
        'tenant-1',
        'emp-1',
        'req-1',
        { status: 'VERIFIED' },
      );
    });

    it('should delegate svsp course add and delete', async () => {
      repository.createSvspCourse.mockResolvedValue({ id: 'svsp-1' } as any);
      repository.deleteSvspCourse.mockResolvedValue({ id: 'svsp-1' } as any);

      await service.addSvspCourse('tenant-1', 'emp-1', {
        svspLevelId: 'lvl-1',
        academyId: 'acad-1',
        nroCode: 'NRO-123',
        issueDate: '2026-01-01',
      });
      await service.deleteSvspCourse('tenant-1', 'svsp-1');

      expect(repository.createSvspCourse).toHaveBeenCalled();
      expect(repository.deleteSvspCourse).toHaveBeenCalledWith(
        'tenant-1',
        'svsp-1',
      );
    });

    it('should delegate internal training add and delete', async () => {
      repository.createInternalTraining.mockResolvedValue({
        id: 'train-1',
      } as any);
      repository.deleteInternalTraining.mockResolvedValue({
        id: 'train-1',
      } as any);

      await service.addInternalTraining('tenant-1', 'emp-1', {
        title: 'Polígono',
        topic: 'Armamento',
        instructorName: 'Instructor 1',
        trainingDate: '2026-02-01',
      });
      await service.deleteInternalTraining('tenant-1', 'train-1');

      expect(repository.createInternalTraining).toHaveBeenCalled();
      expect(repository.deleteInternalTraining).toHaveBeenCalledWith(
        'tenant-1',
        'train-1',
      );
    });
  });

  describe('exportRenovaExcel', () => {
    it('should map export items and invoke excel exporter', async () => {
      repository.findDataForRenovaExport.mockResolvedValue({
        settings: {
          companyLegalName: 'SEGURIDAD S.A.S.',
          companyNit: '900555666',
        } as any,
        employees: [
          {
            documentType: 'CC',
            document: '79111222',
            firstName: 'Javier',
            lastName: 'Lopez',
            gender: 'M',
            birthdate: new Date('1985-04-12'),
            entryDate: new Date('2023-01-15'),
            payrollProfile: {
              daneCityCode: '11001',
              daneCityName: 'Bogotá D.C.',
              primaryDependency: { name: 'PUESTO 1' },
            },
            svspCourses: [
              {
                nroCode: 'NRO-79111222',
                issueDate: new Date('2026-01-10'),
                expiryDate: new Date('2027-01-10'),
                svspLevel: { code: '1101', name: 'FUNDAMENTACION' },
                academy: { nit: '800111222', name: 'ACADEMIA 1' },
              },
            ],
          },
        ] as any,
      });

      const fakeBuffer = Buffer.from('excel-data');
      renovaExporter.generateRenovaExcelBuffer.mockResolvedValue(fakeBuffer);

      const buffer = await service.exportRenovaExcel('tenant-1');
      expect(buffer).toBe(fakeBuffer);
      expect(renovaExporter.generateRenovaExcelBuffer).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            document: '79111222',
            status: 'VIGENTE',
            svspCourseCode: '1101',
          }),
        ]),
        'SEGURIDAD S.A.S.',
        '900555666',
      );
    });
  });
});
