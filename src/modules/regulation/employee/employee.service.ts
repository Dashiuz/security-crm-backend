import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmployeeRepositoryService } from '../../../common/repository/index';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dtos/index';

@Injectable()
export class EmployeeService {
  constructor(private readonly employeeRepository: EmployeeRepositoryService) {}

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

  async createEmployee(dto: CreateEmployeeDto) {
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

    // 2) verify active tenant
    const tenant = await this.employeeRepository.checkTenantActive(
      dto.tenantId,
    );

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

    // 4) Create employee
    const employee = await this.employeeRepository.createEmployee(tenant.id, {
      tenant: { connect: { id: tenant.id } },
      firstName: dto.firstName.trim(),
      secondName: dto.secondName?.trim() ?? null,
      lastName: dto.lastName.trim(),
      maternalSurname: dto.maternalSurname?.trim() ?? null,
      fullName,
      documentType: dto.documentType.trim(),
      document,
      birthdate,
      gender: dto.gender.trim(),
      department: dto.department.trim(),
      position: dto.position.trim(),
      email: email ?? null,
      phone: dto.phone?.trim() ?? null,
      entryDate,
      isRetired: dto.isRetired ?? false,
      isActive: dto.isActive ?? true,
      retiredAt: retiredAt,
    });

    return employee;
  }

  async findActiveByDocument(document: string) {
    return await this.employeeRepository.findActiveByDocument(document);
  }

  async findAnyEmployeeById(id: string) {
    const employee = await this.employeeRepository.findAnyById(id);

    return employee;
  }

  async updateEmployee(employeeId: string, dto: UpdateEmployeeDto) {
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
    setString('department');
    setString('position');

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
    return this.employeeRepository.updateEmployee(employeeId, patch);
  }

  async softDeleteEmployee(employeeId: string) {
    const current = await this.employeeRepository.findAnyById(employeeId);

    if (!current) throw new NotFoundException('Employee not found.');

    // Idempotency: if already deleted, return the same data
    if (current.deletedAt) {
      return {
        id: current.id,
        tenantId: current.tenantId,
        fullName: current.fullName,
        document: current.document,
        isActive: current.isActive,
        deletedAt: current.deletedAt,
        updatedAt: current.updatedAt,
      };
    }

    return this.employeeRepository.softDeleteEmployee(employeeId);
  }
}
