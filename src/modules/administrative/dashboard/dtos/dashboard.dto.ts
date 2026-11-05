import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardKpisDto {
  @ApiProperty({
    description: 'Cantidad de clientes / copropiedades activas',
    example: 42,
  })
  activeClients!: number;

  @ApiProperty({
    description: 'Prospectos comerciales en el pipeline de captación',
    example: 18,
  })
  prospectsInPipeline!: number;

  @ApiProperty({
    description: 'Tickets PQRS abiertos o en gestión',
    example: 7,
  })
  openPqrs!: number;

  @ApiProperty({
    description:
      'Porcentaje de cumplimiento de Acuerdos de Nivel de Servicio (ANS / SLA)',
    example: 98.4,
  })
  ansComplianceRate!: number;

  @ApiProperty({
    description: 'Guardias de seguridad y operativos activos',
    example: 165,
  })
  activeGuards!: number;

  @ApiProperty({
    description:
      'Paquetes de correspondencia en custodia de portería sin entregar',
    example: 14,
  })
  pendingPackages!: number;
}

export class AnsTrendPointDto {
  @ApiProperty({ example: 'Semana 42' })
  week!: string;

  @ApiProperty({ description: 'Tasa real de cumplimiento (%)', example: 97.8 })
  compliance!: number;

  @ApiProperty({
    description: 'Meta estándar institucional (%)',
    example: 95.0,
  })
  target!: number;

  @ApiProperty({
    description: 'Total de tickets evaluados en el periodo',
    example: 28,
  })
  totalTickets!: number;
}

export class CommercialFunnelStageDto {
  @ApiProperty({ example: 'Propuestas en Borrador' })
  stage!: string;

  @ApiProperty({ description: 'Cantidad de propuestas', example: 8 })
  count!: number;

  @ApiProperty({
    description: 'Valor total cotizado o adjudicado en COP',
    example: 185000000,
  })
  totalValue!: number;
}

export class DashboardChartsDto {
  @ApiProperty({ type: [AnsTrendPointDto] })
  ansWeeklyTrend!: AnsTrendPointDto[];

  @ApiProperty({ type: [CommercialFunnelStageDto] })
  commercialFunnel!: CommercialFunnelStageDto[];
}

export class DashboardOverviewResponseDto {
  @ApiProperty({ type: DashboardKpisDto })
  kpis!: DashboardKpisDto;

  @ApiProperty({ type: DashboardChartsDto })
  charts!: DashboardChartsDto;

  @ApiProperty({ example: '2026-11-03T17:00:00.000Z' })
  updatedAt!: Date;
}

export type ReminderUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ReminderModule =
  | 'PQRS'
  | 'COMMERCIAL'
  | 'CLIENTS'
  | 'PORTERIA'
  | 'TALENT';

export class DashboardReminderDto {
  @ApiProperty({ example: 'rem-pqrs-1' })
  id!: string;

  @ApiProperty({ example: 'PQRS' })
  module!: ReminderModule;

  @ApiProperty({ example: 'Ticket Crítico por Vencer ANS' })
  title!: string;

  @ApiProperty({
    example:
      'El ticket PQRS-2026-089 (Falla perimetral) vence en menos de 4 horas',
  })
  description!: string;

  @ApiProperty({
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    example: 'CRITICAL',
  })
  urgency!: ReminderUrgency;

  @ApiPropertyOptional({ example: '2026-11-04T12:00:00.000Z' })
  dueDate?: Date | null;

  @ApiProperty({ example: '/administrative/pqrs' })
  actionPath!: string;

  @ApiProperty({ example: 'Gestionar Ticket' })
  actionLabel!: string;
}

export class DashboardRemindersSummaryDto {
  @ApiProperty({ example: 2 })
  critical!: number;

  @ApiProperty({ example: 5 })
  high!: number;

  @ApiProperty({ example: 4 })
  medium!: number;

  @ApiProperty({ example: 11 })
  total!: number;
}

export class DashboardRemindersResponseDto {
  @ApiProperty({ type: [DashboardReminderDto] })
  reminders!: DashboardReminderDto[];

  @ApiProperty({ type: DashboardRemindersSummaryDto })
  summary!: DashboardRemindersSummaryDto;
}
