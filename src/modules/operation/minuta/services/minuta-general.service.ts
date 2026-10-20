import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { MinutaRepositoryService } from '../../../../common/repository/minuta/minuta/minuta.repository.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { MailService } from '../../../../common/mail/mail.service';
import {
  CreateMinutaDto,
  UpdateMinutaDto,
  VoidRecordDto,
  MinutaFilterQueryDto,
} from '../dtos/minuta-general.dto';
import { RecordStatus, OperationalCategory } from '@prisma/client';

@Injectable()
export class MinutaGeneralService {
  private readonly logger = new Logger(MinutaGeneralService.name);

  constructor(
    private readonly repository: MinutaRepositoryService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateMinutaDto, userId: string, tenantId: string) {
    const {
      date,
      time,
      occurredAt,
      unitId,
      residentId,
      clientId,
      isInternal,
      ...others
    } = dto;
    const parseTime = (t: string) =>
      t.includes('T')
        ? new Date(t)
        : new Date(`1970-01-01T${t.length === 5 ? t + ':00' : t}`);

    const dataToCreate: any = {
      ...others,
      isInternal: isInternal ?? false,
      date: new Date(date),
      time: parseTime(time),
      occurredAt: new Date(occurredAt),
      tenant: { connect: { id: tenantId } },
      createdBy: { connect: { id: userId } },
    };

    if (clientId) {
      dataToCreate.client = { connect: { id: clientId } };
    }
    if (unitId) {
      dataToCreate.unit = { connect: { id: unitId } };
    }
    if (residentId) {
      dataToCreate.resident = { connect: { id: residentId } };
    }

    const record = await this.repository.create(dataToCreate);

    if (dto.priority && dto.priority >= 4) {
      await this.handleAlertEscalation(record, dto.priority, tenantId);
    }

    return record;
  }

  async findAll(query?: MinutaFilterQueryDto) {
    const where: any = {
      status: { not: RecordStatus.VOIDED },
      deletedAt: null,
    };
    if (query?.isInternal === 'true') {
      where.isInternal = true;
      if (query?.clientId) {
        where.clientId = query.clientId;
      }
    } else if (query?.isInternal === 'false') {
      where.isInternal = false;
      if (query?.clientId) {
        where.clientId = query.clientId;
      }
    } else if (query?.clientId) {
      where.clientId = query.clientId;
    }
    if (query?.unitId) {
      where.unitId = query.unitId;
    }
    if (query?.residentId) {
      where.residentId = query.residentId;
    }
    if (query?.search) {
      where.annotation = { contains: query.search.trim(), mode: 'insensitive' };
    }
    if (query?.startDate || query?.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    const take = query?.take
      ? Number(query.take)
      : query?.cursor
        ? 20
        : undefined;

    const pagination = {
      cursor: query?.cursor,
      take,
      skip: query?.cursor ? 1 : undefined,
    };

    const data = await this.repository.findMany(where, pagination);
    const nextCursor =
      take && data.length === take ? data[data.length - 1].id : null;

    return {
      data,
      meta: {
        nextCursor,
      },
    };
  }

  async findOne(id: string) {
    const record = await this.repository.findUnique({ id });
    if (!record || record.deletedAt)
      throw new NotFoundException('Minuta not found');
    return record;
  }

  async update(id: string, dto: UpdateMinutaDto, userId: string) {
    const {
      date,
      time,
      occurredAt,
      unitId,
      residentId,
      isInternal,
      ...others
    } = dto;
    const parseTime = (t: string) =>
      t.includes('T')
        ? new Date(t)
        : new Date(`1970-01-01T${t.length === 5 ? t + ':00' : t}`);

    const updateData: Record<string, unknown> = { ...others };
    if (date) updateData.date = new Date(date);
    if (time) updateData.time = parseTime(time);
    if (occurredAt) updateData.occurredAt = new Date(occurredAt);
    if (isInternal !== undefined) updateData.isInternal = isInternal;
    if (unitId !== undefined) {
      (updateData as any).unit = unitId
        ? { connect: { id: unitId } }
        : { disconnect: true };
    }
    if (residentId !== undefined) {
      (updateData as any).resident = residentId
        ? { connect: { id: residentId } }
        : { disconnect: true };
    }

    const existing = await this.repository.findUnique({ id });
    if (!existing || existing.deletedAt)
      throw new NotFoundException('Minuta not found');

    const updated = await this.repository.update(
      { id },
      {
        ...updateData,
        updatedBy: { connect: { id: userId } },
      },
    );

    if (
      dto.priority &&
      dto.priority >= 4 &&
      dto.priority !== existing.priority
    ) {
      await this.handleAlertEscalation(
        updated,
        dto.priority,
        existing.tenantId,
      );
    }

    return updated;
  }

  async void(id: string, dto: VoidRecordDto, userId: string) {
    return this.repository.update({ id }, {
      status: RecordStatus.VOIDED,
      voidReason: dto.voidReason,
      voidedAt: new Date(),
      voidedBy: { connect: { id: userId } },
    } as any);
  }

  async remove(id: string, userId: string) {
    const existing = await this.repository.findUnique({ id });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(
        'Registro de minuta no encontrado o ya eliminado.',
      );
    }
    return this.repository.update({ id }, {
      deletedAt: new Date(),
      deletedBy: { connect: { id: userId } },
    } as any);
  }

  private async handleAlertEscalation(
    record: any,
    priority: number,
    tenantId: string,
  ) {
    if (priority < 4) return;

    try {
      let clientName = 'Puesto General';
      const targetUserIds: string[] = [];
      const targetDocuments: string[] = [];

      const targetCategories: OperationalCategory[] = [
        OperationalCategory.COORDINATOR,
        OperationalCategory.SUPERVISOR,
      ];
      if (priority === 5) {
        targetCategories.push(OperationalCategory.DIRECTOR);
      }

      if (record.clientId) {
        const client = await this.prisma.client.findUnique({
          where: { id: record.clientId },
          select: { id: true, name: true },
        });
        if (client) {
          clientName = client.name;
        }

        const siteAccesses =
          (await this.prisma.userClientAccess.findMany({
            where: {
              clientId: record.clientId,
              tenantId,
              isActive: true,
              user: {
                isActive: true,
                isRetired: false,
              },
            },
            include: {
              user: {
                select: {
                  id: true,
                  document: true,
                  fullName: true,
                },
              },
            },
          })) || [];

        const assignedDocs = siteAccesses
          .map((sa) => sa.user?.document)
          .filter((doc): doc is string => Boolean(doc));

        const eligibleEmployees =
          assignedDocs.length > 0
            ? (await this.prisma.employee.findMany({
                where: {
                  tenantId,
                  document: { in: assignedDocs },
                  isActive: true,
                  isRetired: false,
                  positionRef: {
                    operationalCategory: { in: targetCategories },
                  },
                },
                select: { document: true, email: true },
              })) || []
            : [];

        const eligibleDocMap = new Map(
          eligibleEmployees.map((e) => [e.document, e.email]),
        );

        for (const sa of siteAccesses) {
          if (!sa.user) continue;

          const isEligibleDoc = eligibleDocMap.has(sa.user.document);
          const hasEligibleRoleName =
            sa.roleName &&
            [
              'COORDINADOR',
              'COORDINATOR',
              'SUPERVISOR',
              'DIRECTOR',
              'DIRECTOR_OPERACIONES',
            ].some((r) => sa.roleName!.toUpperCase().includes(r));

          if ((isEligibleDoc || hasEligibleRoleName) && sa.userId) {
            targetUserIds.push(sa.userId);
            if (sa.user?.document) {
              targetDocuments.push(sa.user.document);
            }
          }
        }
      } else {
        // Global / General Minuta (no client assigned): escalate to tenant-level operational managers
        const tenantManagers =
          (await this.prisma.employee.findMany({
            where: {
              tenantId,
              isActive: true,
              isRetired: false,
              positionRef: {
                operationalCategory: { in: targetCategories },
              },
            },
            select: { document: true, email: true },
          })) || [];

        const managerDocs = tenantManagers
          .map((m) => m.document)
          .filter(Boolean);

        if (managerDocs.length > 0) {
          const managerUsers = await this.prisma.user.findMany({
            where: {
              tenantId,
              document: { in: managerDocs },
              isActive: true,
              isRetired: false,
            },
            select: { id: true, document: true },
          });

          for (const u of managerUsers) {
            targetUserIds.push(u.id);
            if (u.document) {
              targetDocuments.push(u.document);
            }
          }
        }
      }

      const userIds = Array.from(new Set(targetUserIds));

      const priorityLabel = priority === 5 ? 'CRÍTICA' : 'ALTA';
      const title = `🚨 [ALERTA ${priorityLabel}] ${clientName}`;
      const message = `Se ha registrado una novedad de prioridad ${priorityLabel} (${priority}/5): "${record.annotation.substring(0, 100)}${record.annotation.length > 100 ? '...' : ''}"`;
      const notificationType = priority === 5 ? 'CRITICAL_ALERT' : 'HIGH_ALERT';
      const link = `/operation/minuta-general`;

      if (userIds.length > 0) {
        await Promise.allSettled(
          userIds.map((uid) =>
            this.notificationsService.createNotification({
              tenantId,
              userId: uid,
              title,
              message,
              type: notificationType,
              link,
            }),
          ),
        );
      }

      if (priority === 5) {
        const uniqueDocs = Array.from(new Set(targetDocuments));
        let recipientEmails: string[] = [];

        if (uniqueDocs.length > 0) {
          const employees = await this.prisma.employee.findMany({
            where: {
              tenantId,
              document: { in: uniqueDocs },
              email: { not: null },
              isActive: true,
              isRetired: false,
            },
            select: { email: true },
          });

          recipientEmails = employees
            .map((e) => e.email?.trim())
            .filter((em): em is string => Boolean(em));
        }

        // Fallback: Si el cliente no tiene directores/supervisores asignados, notificar al correo corporativo del tenant
        if (recipientEmails.length === 0) {
          const tenantProfile = await this.prisma.tenantProfile.findUnique({
            where: { tenantId },
            select: { contactEmail: true },
          });
          if (tenantProfile?.contactEmail) {
            recipientEmails.push(tenantProfile.contactEmail.trim());
          }
        }

        recipientEmails = Array.from(new Set(recipientEmails));

        if (recipientEmails.length > 0) {
          const radicado = record.id.slice(-8).toUpperCase();
          const htmlTemplate = `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 2px solid #d32f2f; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #d32f2f; color: #ffffff; padding: 18px 24px;">
                <h2 style="margin: 0; font-size: 20px;">🚨 ALERTA CRÍTICA OPERATIVA DE SEGURIDAD</h2>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Radicado #${radicado} - Prioridad Máxima (5/5)</p>
              </div>
              <div style="padding: 24px; color: #333333; line-height: 1.6;">
                <p style="font-size: 16px; margin-top: 0;">Se ha reportado un incidente de máxima severidad que requiere atención inmediata.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr>
                    <td style="padding: 8px 12px; background: #fdf2f2; font-weight: bold; width: 30%;">Sede / Cliente:</td>
                    <td style="padding: 8px 12px; background: #fdf2f2;">${clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; font-weight: bold;">Puesto:</td>
                    <td style="padding: 8px 12px;">${record.guardPost || 'Principal'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; background: #fdf2f2; font-weight: bold;">Fecha y Hora:</td>
                    <td style="padding: 8px 12px; background: #fdf2f2;">${new Date(record.occurredAt || record.date).toLocaleString('es-CO')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; font-weight: bold;">Reportado por:</td>
                    <td style="padding: 8px 12px;">${record.createdBy?.fullName || 'Personal de Turno'}</td>
                  </tr>
                </table>
                <div style="background: #fff5f5; border-left: 4px solid #d32f2f; padding: 14px 18px; margin: 20px 0;">
                  <h4 style="margin: 0 0 8px 0; color: #b71c1c;">Detalle de la Novedad / Anotación:</h4>
                  <p style="margin: 0; font-size: 15px; color: #222222; white-space: pre-wrap;">${record.annotation}</p>
                </div>
                <p style="font-size: 13px; color: #666666; margin-bottom: 0;">
                  Por favor ingrese inmediatamente al sistema de control de operaciones para activar los protocolos de contingencia y seguimiento.
                </p>
              </div>
            </div>
          `;

          await this.mailService.sendMail({
            to: recipientEmails,
            subject: `🚨 [ALERTA CRÍTICA] ${clientName} - Novedad de Seguridad Radicado #${radicado}`,
            html: htmlTemplate,
          });
        }
      }
    } catch (err) {
      this.logger.error('Error during alert escalation dispatch', err);
    }
  }
}
