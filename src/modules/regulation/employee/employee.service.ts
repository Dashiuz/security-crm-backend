import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  EmployeeRepositoryService,
  UserRepositoryService,
} from '../../../common/repository/index';
import { S3Service } from '../../storage/services/s3.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeResponseDto,
  DeletedEmployeeDto,
} from './dtos/index';
import { toDateOnlyIso } from '../../../common/utils/convertDate';
import { EmployeeWithRefs } from './types/employee-with-refs';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly employeeRepository: EmployeeRepositoryService,
    private readonly userRepository: UserRepositoryService,
    private readonly s3Service: S3Service,
  ) {}

  private buildFullName(input: {
    firstName: string;
    secondName?: string | null;
    lastName: string;
    maternalSurname?: string | null;
  }) {
    return [
      input.firstName,
      input.secondName,
      input.lastName,
      input.maternalSurname,
    ]
      .filter((p) => (p ?? '').trim().length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async mapEmployeeToResponse(row: any): Promise<EmployeeResponseDto> {
    let avatarUrl: string | null = null;
    if (row.mediaAttachments && row.mediaAttachments.length > 0) {
      try {
        avatarUrl = await this.s3Service.getPresignedUrl(row.mediaAttachments[0].s3Key);
      } catch {
        avatarUrl = null;
      }
    }

    return {
      id: row.id,
      tenantId: row.tenantId,
      fullName: row.fullName,
      firstName: row.firstName,
      secondName: row.secondName,
      lastName: row.lastName,
      maternalSurname: row.maternalSurname,
      documentType: row.documentType,
      document: row.document,
      gender: row.gender,
      address: row.address,
      email: row.email,
      phone: row.phone,
      birthdate: toDateOnlyIso(row.birthdate),
      entryDate: toDateOnlyIso(row.entryDate),
      isActive: row.isActive,
      clientId: row.clientId ?? null,
      clientName: row.client?.name ?? null,
      departmentId: row.departmentId,
      departmentName: row.departmentRef?.name ?? null,
      positionId: row.positionId,
      positionName: row.positionRef?.name ?? null,
      avatarUrl,
      mediaAttachments: row.mediaAttachments ?? [],
    };
  }

  async createEmployee(
    tenantId: string,
    dto: CreateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    // 1) quick business validations
    const birthdate = new Date(dto.birthdate);
    const entryDate = new Date(dto.entryDate);

    if (
      Number.isNaN(birthdate.getTime()) ||
      Number.isNaN(entryDate.getTime())
    ) {
      throw new BadRequestException('Invalid birthdate or entryDate.');
    }

    if (birthdate > entryDate) {
      throw new BadRequestException('birthdate cannot be after entryDate.');
    }

    if (dto.isRetired && !dto.retiredAt) {
      throw new BadRequestException(
        'retiredAt is required when isRetired is true.',
      );
    }

    const retiredAt = dto.retiredAt ? new Date(dto.retiredAt) : null;

    if (dto.retiredAt && Number.isNaN(retiredAt!.getTime())) {
      throw new BadRequestException('Invalid retiredAt.');
    }

    // 2) verify active tenant (keeping this for safety/business check if needed, but tenantId is already in context)
    const tenant = await this.userRepository.checkTenantActive(tenantId);

    if (!tenant) throw new NotFoundException('Tenant not found or inactive.');

    // 3) Minimal normalizations
    const document = dto.document.trim();
    const email = dto.email?.trim().toLowerCase();

    const fullName = this.buildFullName({
      firstName: dto.firstName,
      secondName: dto.secondName,
      lastName: dto.lastName,
      maternalSurname: dto.maternalSurname,
    });

    // 4) Create employee - tenantId is handled by Prisma Extension
    const employee = await this.employeeRepository.createEmployee({
      firstName: dto.firstName.trim(),
      secondName: dto.secondName?.trim() ?? null,
      lastName: dto.lastName.trim(),
      maternalSurname: dto.maternalSurname?.trim() ?? null,
      fullName,
      documentType: dto.documentType.trim(),
      document,
      birthdate,
      gender: dto.gender.trim(),
      clientId: dto.clientId || null,
      departmentId: dto.departmentId || null,
      positionId: dto.positionId || null,
      email: email ?? null,
      phone: dto.phone?.trim() ?? null,
      entryDate,
      isRetired: dto.isRetired ?? false,
      isActive: dto.isActive ?? true,
      retiredAt: retiredAt,
    } as any);

    // Sync clientId to User account if it exists
    if (dto.clientId !== undefined) {
      try {
        const user = await this.userRepository.findByDocument(document);
        if (user) {
          await this.userRepository.updateUser(user.id, { clientId: dto.clientId || null } as any);
        }
      } catch {
        // Ignore if user not found yet
      }
    }

    return await this.mapEmployeeToResponse(employee as any);
  }

  async findAll(): Promise<EmployeeResponseDto[]> {
    const employees = await this.employeeRepository.findAll();
    return Promise.all(
      employees.map((emp) => this.mapEmployeeToResponse(emp as any)),
    );
  }

  async findActiveByDocument(
    document: string,
  ): Promise<EmployeeResponseDto | null> {
    const employee =
      await this.employeeRepository.findActiveByDocument(document);

    if (!employee) return null;

    return await this.mapEmployeeToResponse(employee as any);
  }

  async findAnyEmployeeById(id: string): Promise<EmployeeResponseDto | null> {
    const employeeWithRefs = await this.employeeRepository.findWithRefsById(id);

    if (!employeeWithRefs) return null;

    return await this.mapEmployeeToResponse(employeeWithRefs as any);
  }

  async updateEmployee(
    employeeId: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    const current = await this.employeeRepository.findAnyById(employeeId);

    if (!current) throw new NotFoundException('Employee not found.');

    // 1) normalize and prepare patch
    const patch: Prisma.EmployeeUpdateInput = {};

    const setString = (
      key: keyof UpdateEmployeeDto,
      targetKey?: keyof Prisma.EmployeeUpdateInput,
    ) => {
      const k = targetKey ?? (key as any);
      const val = dto[key];
      if (val === undefined) return;
      if (val === null) {
        (patch as any)[k] = null;
        return;
      }
      (patch as any)[k] = typeof val === 'string' ? val.trim() : val;
    };

    setString('firstName');
    setString('secondName'); // optional string that can be null
    setString('lastName');
    setString('maternalSurname');
    setString('documentType');
    setString('document');
    setString('gender');
    setString('clientId');
    setString('departmentId');
    setString('positionId');
    setString('address');

    if (dto.email !== undefined) {
      patch.email = dto.email === null ? null : dto.email.trim().toLowerCase();
    }

    if (dto.phone !== undefined) {
      patch.phone = dto.phone === null ? null : dto.phone.trim();
    }

    // 2) dates
    const birthdate =
      dto.birthdate !== undefined ? new Date(dto.birthdate) : undefined;
    const entryDate =
      dto.entryDate !== undefined ? new Date(dto.entryDate) : undefined;

    if (birthdate && Number.isNaN(birthdate.getTime()))
      throw new BadRequestException('Invalid birthdate.');

    if (entryDate && Number.isNaN(entryDate.getTime()))
      throw new BadRequestException('Invalid entryDate.');

    if (birthdate) patch.birthdate = birthdate;

    if (entryDate) patch.entryDate = entryDate;

    const retiredAt =
      dto.retiredAt === undefined
        ? undefined
        : dto.retiredAt === null
          ? null
          : new Date(dto.retiredAt);

    if (retiredAt && retiredAt !== null && Number.isNaN(retiredAt.getTime())) {
      throw new BadRequestException('Invalid retiredAt.');
    }

    if (dto.retiredAt !== undefined) patch.retiredAt = retiredAt;

    if (dto.isRetired !== undefined) patch.isRetired = dto.isRetired;

    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    // 3) bussines logic validations
    const effectiveBirthdate = birthdate ?? current.birthdate;
    const effectiveEntryDate = entryDate ?? current.entryDate;

    if (effectiveBirthdate > effectiveEntryDate) {
      throw new BadRequestException('birthdate cannot be after entryDate.');
    }

    const effectiveIsRetired = dto.isRetired ?? current.isRetired;
    const effectiveRetiredAt =
      dto.retiredAt !== undefined ? retiredAt : current.retiredAt;

    if (effectiveIsRetired && !effectiveRetiredAt) {
      // Rule: if its set as retired and no date is provided, set today (or throw error).
      patch.retiredAt = new Date();
    }

    if (!effectiveIsRetired && dto.retiredAt === undefined) {
      // if it goes from retired to not retired, optionally clear retiredAt
      if (current.isRetired) patch.retiredAt = null;
    }

    // 4) Recalculate fullName if any component changed
    const nameTouched =
      dto.firstName !== undefined ||
      dto.secondName !== undefined ||
      dto.lastName !== undefined ||
      dto.maternalSurname !== undefined;

    if (nameTouched) {
      const newFullName = this.buildFullName({
        firstName: dto.firstName?.trim() ?? current.firstName,
        secondName:
          dto.secondName === undefined
            ? current.secondName
            : dto.secondName?.trim() || null,
        lastName: dto.lastName?.trim() ?? current.lastName,
        maternalSurname:
          dto.maternalSurname === undefined
            ? current.maternalSurname
            : dto.maternalSurname?.trim() || null,
      });

      patch.fullName = newFullName;
    }

    // 5) perform update
    const updatedEmployee = await (
      this.employeeRepository as any
    ).updateEmployee(employeeId, patch);

    // Sync clientId to User account if updated
    if (dto.clientId !== undefined) {
      try {
        const effectiveDocument = dto.document?.trim() ?? current.document;
        const user = await this.userRepository.findByDocument(effectiveDocument);
        if (user) {
          await this.userRepository.updateUser(user.id, { clientId: dto.clientId || null } as any);
        }
      } catch {
        // Ignore if user not found
      }
    }

    return await this.mapEmployeeToResponse(updatedEmployee);
  }

  async softDeleteEmployee(employeeId: string): Promise<DeletedEmployeeDto> {
    const current = await this.employeeRepository.findAnyById(employeeId);
    if (!current) throw new NotFoundException('Employee not found.');

    const deletedEmployee =
      await this.employeeRepository.softDeleteEmployee(employeeId);

    // Cascade to User account if exists
    try {
      const user = await this.userRepository.findByDocument(current.document);
      if (user) {
        await this.userRepository.softDeleteUser(user.id);
        await this.userRepository.revokeAllSessionsForUser(user.id);
      }
    } catch {
      // Ignore if user doesn't exist
    }

    return deletedEmployee as any;
  }

  async retireEmployee(employeeId: string): Promise<EmployeeResponseDto> {
    const current = await this.employeeRepository.findAnyById(employeeId);
    if (!current) throw new NotFoundException('Employee not found.');

    if (current.isRetired) {
      throw new BadRequestException('Employee is already retired.');
    }

    const retired = await this.employeeRepository.retireEmployee(employeeId);

    // Cascade to User account if exists
    try {
      const user = await this.userRepository.findByDocument(current.document);
      if (user) {
        await this.userRepository.softDeleteUser(user.id);
        await this.userRepository.revokeAllSessionsForUser(user.id);
      }
    } catch {
      // Ignore if user doesn't exist
    }

    return await this.mapEmployeeToResponse(retired as any);
  }

  async reactivateEmployee(employeeId: string): Promise<EmployeeResponseDto> {
    const current = await this.employeeRepository.findAnyById(employeeId);
    if (!current) throw new NotFoundException('Employee not found.');

    const reactivated = await this.employeeRepository.reactivateEmployee(employeeId);
    return await this.mapEmployeeToResponse(reactivated as any);
  }
}
