import { Injectable, Logger } from '@nestjs/common';
import { PnlHealthStatus, BenefitPeriodicity } from '@prisma/client';
import {
  CalculatePnlDto,
  PnlCalculationResult,
} from '../dtos/pnl-calculation.dto';
import { ProposalServiceItemDto } from '../dtos/proposal-service-item.dto';
import { ProposalValueAddedItemDto } from '../dtos/proposal-value-added-item.dto';

@Injectable()
export class PnlCalculatorService {
  private readonly logger = new Logger(PnlCalculatorService.name);

  /**
   * Redondeo financiero estándar a 2 decimales
   */
  private roundMoney(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /**
   * Calcula en vivo el P&L, costos de nómina, amortización de beneficios y semáforo de margen
   */
  computePnl(dto: CalculatePnlDto): PnlCalculationResult {
    try {
      const contractMonths = dto.contractDurationMonths || 12;
      const discountPercent = dto.promptPaymentDiscPercent || 0;
      const items = dto.items || [];
      const vagItems = dto.valueAddedItems || [];

      // 1. Facturación Mensual Base Pre-Descuento
      let subtotalMonthlyPreDisc = 0;
      let estimatedMonthlyRealCost = 0;

      for (const item of items) {
        const qty = item.quantity || 1;
        const billed = (item.unitMonthlyBilledPrice || 0) * qty;
        const realCost = (item.unitMonthlyRealCost || 0) * qty;

        subtotalMonthlyPreDisc += billed;
        estimatedMonthlyRealCost += realCost;
      }

      subtotalMonthlyPreDisc = this.roundMoney(subtotalMonthlyPreDisc);
      estimatedMonthlyRealCost = this.roundMoney(estimatedMonthlyRealCost);

      // 2. Descuento de pronto pago
      const promptPaymentDiscAmount = this.roundMoney(
        subtotalMonthlyPreDisc * (discountPercent / 100),
      );
      const subtotalMonthlyAfterDisc = this.roundMoney(
        subtotalMonthlyPreDisc - promptPaymentDiscAmount,
      );

      // 3. Impuestos Estatutarios (Decreto 4950 de 2007 / Art. 462-1 E.T.)
      const aiuRate = dto.aiuRate ?? 0.1;
      const ivaOnAiuRate = dto.ivaOnAiuRate ?? 0.19;
      // Base AIU
      const aiuBaseAmount = this.roundMoney(subtotalMonthlyAfterDisc * aiuRate);
      // IVA sobre la base AIU
      const ivaAmount = this.roundMoney(aiuBaseAmount * ivaOnAiuRate);
      // Total Facturado Mensual con Impuestos
      const totalMonthlyWithTax = this.roundMoney(
        subtotalMonthlyAfterDisc + ivaAmount,
      );
      // Total Anual del Contrato
      const totalAnnualContractValue = this.roundMoney(
        totalMonthlyWithTax * contractMonths,
      );

      // 4. Amortización Mensual de Valores Agregados (VAG)
      let monthlyVagAmortization = 0;
      for (const vag of vagItems) {
        const qty = vag.quantity || 1;
        const totalItemCost = (vag.itemInternalCost || 0) * qty;

        if (vag.periodicity === BenefitPeriodicity.MONTHLY_RECURRING) {
          monthlyVagAmortization += totalItemCost;
        } else if (vag.periodicity === BenefitPeriodicity.ANNUAL_RENEWAL) {
          const years = Math.max(1, Math.ceil(contractMonths / 12));
          monthlyVagAmortization += (totalItemCost * years) / contractMonths;
        } else {
          // SINGLE_ONE_TIME (por omisión)
          monthlyVagAmortization += totalItemCost / contractMonths;
        }
      }
      monthlyVagAmortization = this.roundMoney(monthlyVagAmortization);

      // 5. Costo Operativo Total Mensual y Utilidad Neta
      const totalMonthlyOperatingCost = this.roundMoney(
        estimatedMonthlyRealCost + monthlyVagAmortization,
      );
      const netMonthlyMarginAmount = this.roundMoney(
        subtotalMonthlyAfterDisc - totalMonthlyOperatingCost,
      );

      // 6. Margen Neto Porcentual
      let netMarginPercentage = 0;
      if (subtotalMonthlyAfterDisc > 0) {
        netMarginPercentage = this.roundMoney(
          (netMonthlyMarginAmount / subtotalMonthlyAfterDisc) * 100,
        );
      }

      // 7. Semáforo P&L Institucional
      let pnlStatus: PnlHealthStatus = PnlHealthStatus.PROFITABLE;
      if (netMarginPercentage >= 15.0) {
        pnlStatus = PnlHealthStatus.PROFITABLE;
      } else if (netMarginPercentage >= 8.0) {
        pnlStatus = PnlHealthStatus.WARNING_LOW_MARGIN;
      } else {
        pnlStatus = PnlHealthStatus.DEFICIT_BLOCKED;
      }

      return {
        subtotalMonthlyPreDisc,
        promptPaymentDiscPercent: discountPercent,
        promptPaymentDiscAmount,
        subtotalMonthlyAfterDisc,
        aiuBaseAmount,
        ivaAmount,
        totalMonthlyWithTax,
        totalAnnualContractValue,
        estimatedMonthlyRealCost,
        monthlyVagAmortization,
        totalMonthlyOperatingCost,
        netMonthlyMarginAmount,
        netMarginPercentage,
        pnlStatus,
      };
    } catch (error: any) {
      this.logger.error(
        `Error al calcular P&L financiero: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
