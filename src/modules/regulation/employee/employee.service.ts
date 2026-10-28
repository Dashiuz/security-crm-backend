import { randomUUID } from 'crypto';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  EmployeeRepositoryService,
  UserRepositoryService,
  DepartmentRepositoryService,
  PositionRepositoryService,
  ClientRepositoryService,
} from '../../../common/repository/index';
import { S3Service } from '../../storage/services/s3.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeResponseDto,
  DeletedEmployeeDto,
  AssignEmployeeClientDto,
  UnassignEmployeeClientDto,
  EnableEmployeeUserDto,
} from './dtos/index';
import { toDateOnlyIso } from '../../../common/utils/convertDate';
import { EmployeeWithRefs } from './types/employee-with-refs';
import { EmployeeClientHistoryItem } from './types/employee-client-history.interface';

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    private readonly employeeRepository: EmployeeRepositoryService,
    private readonly userRepository: UserRepositoryService,
    private readonly departmentRepository: DepartmentRepositoryService,
    private readonly positionRepository: PositionRepositoryService,
    private readonly clientRepository: ClientRepositoryService,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
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
        avatarUrl = await this.s3Service.getPresignedUrl(
          row.mediaAttachments[0].s3Key,
        );
      } catch (err: any) {
        this.logger.error(
          `Error al obtener presigned URL de avatar de empleado [${row.id}]: ${err?.message || err}`,
          err?.stack,
        );
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
      clientHistory: Array.isArray(row.clientHistory) ? row.clientHistory : [],
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

    // 4) Build initial clientHistory if clientId is provided
    const initialClientHistory: EmployeeClientHistoryItem[] = [];
    if (dto.clientId) {
      try {
        const client = await this.clientRepository.findOne(dto.clientId);
        if (client) {
          initialClientHistory.push({
            id: randomUUID(),
            clientId: client.id,
            clientName: client.name,
            clientCode: (client as any).internalCode ?? null,
            assignedAt: toDateOnlyIso(entryDate),
            unassignedAt: null,
            recordedAt: new Date().toISOString(),
            recordedBy: null,
            notes: 'Asignación inicial al registrar empleado',
          });
        }
      } catch (err: any) {
        this.logger.error(
          `Error al buscar cliente asignado para historial [${dto.clientId}]: ${err?.message || err}`,
          err?.stack,
        );
      }
    }

    // 5) Create employee - tenantId is handled by Prisma Extension
    const employee = await this.employeeRepository.createEmployee({
      firstName: dto.firstName.trim(),
      secondName: dto.secondName?.trim() || null,
      lastName: dto.lastName.trim(),
      maternalSurname: dto.maternalSurname?.trim() || null,
      fullName,
      documentType: dto.documentType.trim(),
      document,
      birthdate,
      gender: dto.gender.trim(),
      address: dto.address.trim(),
      clientId: dto.clientId || null,
      departmentId: dto.departmentId || null,
      positionId: dto.positionId || null,
      email: email ?? null,
      phone: dto.phone?.trim() ?? null,
      entryDate,
      isRetired: dto.isRetired ?? false,
      isActive: dto.isActive ?? true,
      retiredAt: retiredAt,
      clientHistory: initialClientHistory as any,
    } as any);

    // Sync clientId to User account if it exists
    if (dto.clientId !== undefined) {
      try {
        const user = await this.userRepository.findByDocument(document);
        if (user) {
          await this.userRepository.updateUser(user.id, {
            clientId: dto.clientId || null,
          } as any);
        }
      } catch (err: any) {
        this.logger.error(
          `Error al sincronizar clientId en cuenta de usuario vinculada [${document}]: ${err?.message || err}`,
          err?.stack,
        );
      }
    }

    return await this.mapEmployeeToResponse(employee as any);
  }

  async findAll(): Promise<EmployeeResponseDto[]> {
    const employees = await this.employeeRepository.findAll();
    const responses = await Promise.all(
      employees.map((emp) => this.mapEmployeeToResponse(emp as any)),
    );

    if (!this.prisma?.user?.findMany || responses.length === 0) {
      return responses;
    }

    try {
      const documents = responses.map((e) => e.document).filter(Boolean);
      const users = await this.prisma.user.findMany({
        where: {
          document: { in: documents },
          isActive: true,
        },
        select: {
          document: true,
          roles: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      const userMap = new Map<string, string[]>();
      for (const u of users) {
        const roleNames = (u.roles || [])
          .map((r: any) => r.role?.name)
          .filter(Boolean);
        userMap.set(u.document, roleNames);
      }

      return responses.map((res) => {
        const roles = userMap.get(res.document);
        return {
          ...res,
          hasUser: Boolean(roles),
          userRole: roles && roles.length > 0 ? roles[0] : null,
          userRoles: roles || [],
        };
      });
    } catch (err: any) {
      this.logger.error(
        `Error al enriquecer empleados con roles de usuario: ${err?.message || err}`,
        err?.stack,
      );
      return responses;
    }
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

  async autocomplete(query: string, tenantId: string, limit = 20) {
    return this.employeeRepository.autocomplete(query, tenantId, limit);
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
      if (val === null || val === '') {
        (patch as any)[k] = null;
        return;
      }
      (patch as any)[k] = typeof val === 'string' ? val.trim() || null : val;
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

    // Sync User account if exists
    try {
      const effectiveDocument = dto.document?.trim() ?? current.document;
      const user = await this.userRepository.findByDocument(effectiveDocument);
      if (user) {
        const userUpdate: any = {};
        if (dto.clientId !== undefined)
          userUpdate.clientId = dto.clientId || null;
        if (patch.fullName) userUpdate.fullName = patch.fullName;
        if (dto.positionId) {
          const pos = await this.prisma.position.findUnique({
            where: { id: dto.positionId },
          });
          if (pos) userUpdate.position = pos.name;
        }
        if (dto.departmentId) {
          const dept = await this.prisma.department.findUnique({
            where: { id: dto.departmentId },
          });
          if (dept) userUpdate.department = dept.name;
        }
        if (Object.keys(userUpdate).length > 0) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: userUpdate,
          });
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Error al sincronizar actualización de empleado en cuenta de usuario [${current.document}]: ${err?.message || err}`,
        err?.stack,
      );
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
    } catch (err: any) {
      this.logger.error(
        `Error al propagar eliminación suave de empleado a cuenta de usuario [${current.document}]: ${err?.message || err}`,
        err?.stack,
      );
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
    } catch (err: any) {
      this.logger.error(
        `Error al propagar retiro de empleado a cuenta de usuario [${current.document}]: ${err?.message || err}`,
        err?.stack,
      );
    }

    return await this.mapEmployeeToResponse(retired as any);
  }

  async reactivateEmployee(employeeId: string): Promise<EmployeeResponseDto> {
    const current = await this.employeeRepository.findAnyById(employeeId);
    if (!current) throw new NotFoundException('Employee not found.');

    const reactivated =
      await this.employeeRepository.reactivateEmployee(employeeId);
    return await this.mapEmployeeToResponse(reactivated as any);
  }

  async importEmployeesFromCsv(
    data: Array<Record<string, string>>,
    fileName: string,
    user: any,
  ) {
    const existingDepartments = await this.departmentRepository.findMany();
    const existingPositions = await this.positionRepository.findMany();

    let successRows = 0;
    let errorRows = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      try {
        const firstName = row.Nombre || row.firstName || '';
        const lastName = row.Apellido || row.lastName || '';
        const documentType = row.TipoDocumento || row.documentType || '';
        const document = row.Documento || row.document || '';
        const phone = row.Telefono || row.phone || '';

        if (
          !firstName.trim() ||
          !lastName.trim() ||
          !document.trim() ||
          !documentType.trim() ||
          !phone.trim()
        ) {
          throw new Error(
            'Campos obligatorios faltantes: Nombre, Apellido, TipoDocumento, Documento, Telefono.',
          );
        }

        // Check active employee uniqueness
        const exists = await this.employeeRepository.findActiveByDocument(
          document.trim(),
        );
        if (exists) {
          throw new Error(
            `El empleado con documento ${document} ya existe y está activo.`,
          );
        }

        // Handle Department
        let departmentId: string | null = null;
        const deptNameRaw = row.Departamento || row.department;
        if (deptNameRaw) {
          const deptName = deptNameRaw.toString().trim().toUpperCase();
          const matchedDept = existingDepartments.find(
            (d: any) => d.name.toUpperCase() === deptName,
          );
          if (matchedDept) {
            departmentId = matchedDept.id;
          } else {
            throw new Error(
              `El departamento '${deptNameRaw}' no existe en el sistema. Debe crearlo antes de importar.`,
            );
          }
        }

        // Handle Position
        let positionId: string | null = null;
        const posNameRaw = row.Cargo || row.position;
        if (posNameRaw) {
          const posName = posNameRaw.toString().trim().toUpperCase();
          const matchedPos = existingPositions.find(
            (p: any) => p.name.toUpperCase() === posName,
          );
          if (matchedPos) {
            positionId = matchedPos.id;
          } else {
            throw new Error(
              `El cargo '${posNameRaw}' no existe en el sistema. Debe crearlo antes de importar.`,
            );
          }
        }

        const fullName = this.buildFullName({
          firstName: firstName.trim(),
          secondName: row.SegundoNombre || null,
          lastName: lastName.trim(),
          maternalSurname: row.SegundoApellido || null,
        });

        // Handle dates
        const birthdateStr = row.FechaNacimiento || row.birthdate;
        const birthdate = birthdateStr
          ? new Date(birthdateStr)
          : new Date('1990-01-01');

        const entryDateStr = row.FechaIngreso || row.entryDate;
        const entryDate = entryDateStr ? new Date(entryDateStr) : new Date();

        if (Number.isNaN(birthdate.getTime()))
          throw new Error('FechaNacimiento inválida.');
        if (Number.isNaN(entryDate.getTime()))
          throw new Error('FechaIngreso inválida.');

        const emailRaw = row.Email || row.email;

        // Create Employee
        await this.employeeRepository.createEmployee({
          firstName: firstName.trim(),
          secondName: row.SegundoNombre || null,
          lastName: lastName.trim(),
          maternalSurname: row.SegundoApellido || null,
          fullName,
          documentType: documentType.trim(),
          document: document.trim(),
          birthdate,
          gender: (row.Genero || row.gender || 'M').trim().toUpperCase(),
          address: (row.Direccion || row.address || 'ND').trim(),
          departmentId,
          positionId,
          email: emailRaw ? emailRaw.trim().toLowerCase() : null,
          phone: phone.trim(),
          entryDate,
          isRetired: false,
          isActive: true,
          createdBy: user.sub !== 'system' ? user.sub : null,
        } as any);

        successRows++;
      } catch (err: any) {
        this.logger.error(
          `Error al importar fila ${rowNum} de empleados: ${err?.message || err}`,
          err?.stack,
        );
        errorRows++;
        errors.push({
          row: rowNum,
          reason: err.message || 'Error desconocido al crear empleado.',
        });
      }
    }

    return {
      status: 'completed',
      totalRows: data.length,
      successRows,
      errorRows,
      errors,
    };
  }

  async assignClient(
    employeeId: string,
    dto: AssignEmployeeClientDto,
    recordedBy?: string,
  ): Promise<EmployeeResponseDto> {
    const current = await this.employeeRepository.findAnyById(employeeId);
    if (!current) throw new NotFoundException('Empleado no encontrado.');

    if (current.isRetired || !current.isActive) {
      throw new BadRequestException(
        'No se puede asignar un cliente a un empleado inactivo o retirado.',
      );
    }

    const targetClient = await this.clientRepository.findOne(dto.clientId);
    if (!targetClient) {
      throw new NotFoundException('El cliente seleccionado no existe.');
    }

    const todayStr = toDateOnlyIso(new Date());
    const effectiveAssignedAt = dto.assignedAt || todayStr;
    const effectiveUnassignedAt = dto.unassignedAt || todayStr;

    // Validación cronológica: si existía cliente anterior y se desvincula, la desvinculación no puede ser posterior al nuevo inicio si se especificó fecha
    if (
      dto.assignedAt &&
      dto.unassignedAt &&
      dto.unassignedAt > dto.assignedAt
    ) {
      throw new BadRequestException(
        'La fecha de desvinculación del puesto anterior no puede ser posterior a la fecha de inicio en el nuevo puesto.',
      );
    }

    const rawHistory = Array.isArray((current as any).clientHistory)
      ? (current as any).clientHistory
      : [];
    const updatedHistory: EmployeeClientHistoryItem[] = [...rawHistory];

    const isConcurrent = dto.isConcurrent !== false; // defaults to true

    // Check if target client is already actively assigned
    const alreadyActive = updatedHistory.some(
      (h) => h.clientId === targetClient.id && h.unassignedAt === null,
    );
    if (alreadyActive) {
      throw new BadRequestException(
        'El empleado ya se encuentra asignado activamente a este cliente o puesto.',
      );
    }

    if (!isConcurrent && current.clientId) {
      // Close existing active assignments if not concurrent
      for (let i = 0; i < updatedHistory.length; i++) {
        if (updatedHistory[i].unassignedAt === null) {
          updatedHistory[i] = {
            ...updatedHistory[i],
            unassignedAt: effectiveUnassignedAt,
          };
        }
      }
    }

    // Agregar nueva asignación
    const newHistoryItem: EmployeeClientHistoryItem = {
      id: randomUUID(),
      clientId: targetClient.id,
      clientName: targetClient.name,
      clientCode: (targetClient as any)?.internalCode || null,
      assignedAt: effectiveAssignedAt,
      unassignedAt: null,
      recordedAt: new Date().toISOString(),
      recordedBy: recordedBy || null,
      notes: dto.notes?.trim() || null,
    };
    updatedHistory.push(newHistoryItem);

    // Actualizar registro en base de datos
    const updatedEmployee = await this.employeeRepository.updateEmployee(
      employeeId,
      {
        clientId: targetClient.id,
        clientHistory: updatedHistory as any,
      } as any,
    );

    // Sincronizar con cuenta de usuario y UserClientAccess (SSOT Relacional)
    try {
      const user = await this.prisma.user.findFirst({
        where: { document: current.document, tenantId: current.tenantId },
      });

      const roleName =
        (current as any).positionRef?.name ||
        (current as any).positionId ||
        'OPERATIVO';

      if (!isConcurrent) {
        await this.prisma.userClientAccess.updateMany({
          where: {
            OR: [{ employeeId }, ...(user ? [{ userId: user.id }] : [])],
            clientId: { not: targetClient.id },
          },
          data: { isActive: false },
        });
      }

      await this.prisma.userClientAccess.upsert({
        where: {
          employeeId_clientId: {
            employeeId,
            clientId: targetClient.id,
          },
        },
        create: {
          tenantId: current.tenantId,
          employeeId,
          userId: user?.id || null,
          clientId: targetClient.id,
          roleName,
          isActive: true,
        },
        update: {
          isActive: true,
          userId: user?.id || undefined,
          roleName,
        },
      });

      if (user) {
        if (!user.clientId) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { clientId: targetClient.id },
          });
          try {
            await this.userRepository.updateUser(user.id, {
              clientId: targetClient.id,
            } as any);
          } catch (error: unknown) {
            this.logger.error(
              `Could not sync linked user clientId: ${(error as Error).message}`,
              (error as Error).stack,
            );
          }
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Could not sync UserClientAccess in assignClient: ${err?.message || err}`,
        err?.stack,
      );
    }

    return await this.mapEmployeeToResponse(updatedEmployee);
  }

  async unassignClient(
    employeeId: string,
    dto: UnassignEmployeeClientDto,
    recordedBy?: string,
  ): Promise<EmployeeResponseDto> {
    const current = await this.employeeRepository.findAnyById(employeeId);
    if (!current) throw new NotFoundException('Empleado no encontrado.');

    const rawHistory = Array.isArray((current as any).clientHistory)
      ? (current as any).clientHistory
      : [];
    const updatedHistory: EmployeeClientHistoryItem[] = [...rawHistory];

    const activeAssignments = updatedHistory.filter(
      (h) => h.unassignedAt === null,
    );

    if (activeAssignments.length === 0 && !current.clientId) {
      throw new BadRequestException(
        'El empleado no tiene ningún cliente asignado actualmente.',
      );
    }

    const todayStr = toDateOnlyIso(new Date());
    const effectiveUnassignedAt = dto.unassignedAt || todayStr;
    let targetClientIdToClose = dto.clientId;

    if (targetClientIdToClose) {
      const targetIndex = updatedHistory.findIndex(
        (h) => h.clientId === targetClientIdToClose && h.unassignedAt === null,
      );
      if (targetIndex === -1) {
        throw new BadRequestException(
          'El empleado no tiene asignado activamente el cliente especificado.',
        );
      }
      updatedHistory[targetIndex] = {
        ...updatedHistory[targetIndex],
        unassignedAt: effectiveUnassignedAt,
        notes: dto.notes?.trim() || updatedHistory[targetIndex].notes,
      };
    } else {
      if (activeAssignments.length > 0) {
        targetClientIdToClose = activeAssignments[0].clientId;
        const activeIndex = updatedHistory.findIndex(
          (h) => h.unassignedAt === null,
        );
        if (activeIndex !== -1) {
          updatedHistory[activeIndex] = {
            ...updatedHistory[activeIndex],
            unassignedAt: effectiveUnassignedAt,
            notes: dto.notes?.trim() || updatedHistory[activeIndex].notes,
          };
        }
      }
    }

    const remainingActive = updatedHistory.filter(
      (h) => h.unassignedAt === null,
    );
    const newClientId =
      remainingActive.length > 0
        ? remainingActive[remainingActive.length - 1].clientId
        : null;

    const updatedEmployee = await this.employeeRepository.updateEmployee(
      employeeId,
      {
        clientId: newClientId,
        clientHistory: updatedHistory as any,
      } as any,
    );

    // Sincronizar con User y UserClientAccess
    try {
      const user = await this.prisma.user.findFirst({
        where: { document: current.document, tenantId: current.tenantId },
      });
      if (targetClientIdToClose) {
        await this.prisma.userClientAccess.updateMany({
          where: {
            OR: [{ employeeId }, ...(user ? [{ userId: user.id }] : [])],
            clientId: targetClientIdToClose,
          },
          data: { isActive: false },
        });
      }
      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { clientId: newClientId },
        });
        try {
          await this.userRepository.updateUser(user.id, {
            clientId: newClientId,
          } as any);
        } catch (error: unknown) {
          this.logger.error(
            `Could not sync linked user clientId on unassign: ${(error as Error).message}`,
            (error as Error).stack,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Could not sync UserClientAccess on unassign: ${err?.message || err}`,
        err?.stack,
      );
    }

    return await this.mapEmployeeToResponse(updatedEmployee);
  }

  async getWorkforceSummary(employeeId: string) {
    const employee = await this.employeeRepository.findAnyById(employeeId);
    if (!employee) throw new NotFoundException('Empleado no encontrado.');

    const employeeDto = await this.mapEmployeeToResponse(employee);

    // Find linked user
    const linkedUser = await this.prisma.user.findFirst({
      where: {
        document: employee.document,
        tenantId: employee.tenantId,
        deletedAt: null,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        clientAccesses: {
          where: { isActive: true },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                internalCode: true,
                nit: true,
                address: true,
                city: true,
              },
            },
          },
        },
      },
    });

    const rawHistory: EmployeeClientHistoryItem[] = Array.isArray(
      (employee as any).clientHistory,
    )
      ? (employee as any).clientHistory
      : [];

    const activeFromHistory = rawHistory.filter((h) => h.unassignedAt === null);

    const activeAssignmentsMap = new Map<string, any>();

    for (const h of activeFromHistory) {
      activeAssignmentsMap.set(h.clientId, {
        clientId: h.clientId,
        clientName: h.clientName,
        clientCode: h.clientCode,
        assignedAt: h.assignedAt,
        notes: h.notes,
        roleName: (employee as any).positionRef?.name || null,
        source: 'EMPLOYEE_HISTORY',
      });
    }

    const historyList: EmployeeClientHistoryItem[] = [...rawHistory];

    if (linkedUser?.clientAccesses) {
      for (const ca of linkedUser.clientAccesses) {
        if (!activeAssignmentsMap.has(ca.clientId)) {
          activeAssignmentsMap.set(ca.clientId, {
            clientId: ca.clientId,
            clientName: ca.client?.name || 'Cliente',
            clientCode: ca.client?.internalCode || null,
            assignedAt: toDateOnlyIso(ca.createdAt),
            roleName: ca.roleName,
            source: 'USER_CLIENT_ACCESS',
          });
        } else {
          const existing = activeAssignmentsMap.get(ca.clientId);
          if (ca.roleName) {
            existing.roleName = ca.roleName;
          }
        }

        // Si la sede no está en el historial del empleado, agregarla para que aparezca en el timeline
        const inHistory = historyList.some((h) => h.clientId === ca.clientId);
        if (!inHistory) {
          historyList.push({
            id: ca.id,
            clientId: ca.clientId,
            clientName: ca.client?.name || 'Cliente',
            clientCode: ca.client?.internalCode || null,
            assignedAt: toDateOnlyIso(ca.createdAt),
            unassignedAt: ca.isActive ? null : toDateOnlyIso(ca.updatedAt),
            recordedAt: ca.createdAt.toISOString(),
            recordedBy: null,
            notes: 'Asignación sincronizada desde acceso digital',
          });
        }
      }
    }

    const userData = linkedUser
      ? {
          id: linkedUser.id,
          document: linkedUser.document,
          fullName: linkedUser.fullName,
          userType: linkedUser.userType,
          isActive: linkedUser.isActive,
          isFirstLogin: linkedUser.isFirstLogin,
          createdAt: linkedUser.createdAt,
          roles: linkedUser.roles.map((r) => ({
            id: r.role.id,
            name: r.role.name,
          })),
          clientAccesses: (linkedUser.clientAccesses || []).map((ca) => ({
            clientId: ca.clientId,
            roleName: ca.roleName,
            isActive: ca.isActive,
            client: ca.client,
          })),
        }
      : null;

    return {
      employee: employeeDto,
      user: userData,
      activeAssignments: Array.from(activeAssignmentsMap.values()),
      clientHistory: historyList,
      history: historyList,
    };
  }

  async enableUser(
    employeeId: string,
    dto: EnableEmployeeUserDto,
    recordedBy?: string,
  ) {
    const employee = await this.employeeRepository.findAnyById(employeeId);
    if (!employee) throw new NotFoundException('Empleado no encontrado.');

    if (employee.isRetired || !employee.isActive) {
      throw new BadRequestException(
        'No se puede habilitar usuario para un empleado retirado o inactivo.',
      );
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { document: employee.document, tenantId: employee.tenantId },
    });
    if (existingUser) {
      throw new ConflictException(
        'El empleado ya cuenta con una cuenta de usuario digital vinculada.',
      );
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    let roleIds = dto.roleIds || [];
    if (roleIds.length === 0) {
      const defaultRole = await this.prisma.role.findFirst({
        where: {
          tenantId: employee.tenantId,
          name: { in: ['EMPLOYEE', 'VIGILANTE', 'OPERATIVO'] },
        },
      });
      if (defaultRole) {
        roleIds = [defaultRole.id];
      }
    }

    const newUser = await this.prisma.user.create({
      data: {
        tenantId: employee.tenantId,
        document: employee.document,
        fullName: employee.fullName,
        department: (employee as any).departmentRef?.name || 'OPERACIONES',
        position: (employee as any).positionRef?.name || 'VIGILANTE',
        passwordHash,
        clientId: employee.clientId || null,
        isFirstLogin: true,
        isActive: true,
        isRetired: false,
        createdBy: recordedBy || null,
        roles: {
          create: roleIds.map((rId) => ({
            roleId: rId,
          })),
        },
      },
      include: {
        roles: { include: { role: true } },
      },
    });

    // Vincular userId en los UserClientAccess existentes del empleado
    try {
      await this.prisma.userClientAccess.updateMany({
        where: { employeeId: employee.id },
        data: { userId: newUser.id },
      });
    } catch (linkErr: any) {
      this.logger.error(
        `Could not link new user to existing UserClientAccess: ${linkErr?.message || linkErr}`,
        linkErr?.stack,
      );
    }

    // Heredar asignaciones activas en UserClientAccess
    const rawHistory = Array.isArray((employee as any).clientHistory)
      ? (employee as any).clientHistory
      : [];
    const activeAssignments = rawHistory.filter((h) => h.unassignedAt === null);

    const clientsToInherit = new Set<string>();
    if (employee.clientId) clientsToInherit.add(employee.clientId);
    for (const a of activeAssignments) {
      if (a.clientId) clientsToInherit.add(a.clientId);
    }

    for (const cId of clientsToInherit) {
      try {
        await this.prisma.userClientAccess.upsert({
          where: {
            employeeId_clientId: {
              employeeId: employee.id,
              clientId: cId,
            },
          },
          create: {
            tenantId: employee.tenantId,
            employeeId: employee.id,
            userId: newUser.id,
            clientId: cId,
            roleName: (employee as any).positionRef?.name || 'OPERATIVO',
            isActive: true,
          },
          update: {
            userId: newUser.id,
            isActive: true,
          },
        });
      } catch (inheritErr) {
        this.logger.error(
          'Error inheriting client to userClientAccess:',
          inheritErr,
        );
      }
    }

    return await this.getWorkforceSummary(employeeId);
  }
}
