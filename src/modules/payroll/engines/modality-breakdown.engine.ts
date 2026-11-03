import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface ModalityItemInput {
  conceptId: string;
  conceptCode: number;
  conceptName: string;
  percentage: number;
}

export interface BreakdownItemResult {
  conceptId: string;
  conceptCode: number;
  conceptName: string;
  percentage: number;
  calculatedValue: number;
}

export interface ModalityBreakdownResult {
  daysWorked: number;
  baseSalary: number;
  excessDistributed: number;
  totalGrossPay: number;
  breakdownItems: BreakdownItemResult[];
}

@Injectable()
export class ModalityBreakdownEngine {
  private readonly logger = new Logger(ModalityBreakdownEngine.name);

  /**
   * Calculates the exact wage component breakdown for a post / dependency
   * based on the guaranteed monthly pay and the shift modality percentages.
   *
   * Formulated according to Pronos User Manual (Page 14):
   * 1. Proportional SMMLV is assigned to Concept 1 (Sueldo Básico).
   * 2. The excess above proportional SMMLV is distributed proportionally among the
   *    supplementary concepts defined in the Shift Modality according to their percentage weights.
   * 3. Exact rounding and penny balancing ensures total equals monthlyPaidValue to the cent.
   */
  public calculateBreakdown(params: {
    monthlyPaidValue: number;
    smmlv: number;
    daysWorked?: number;
    items: ModalityItemInput[];
  }): ModalityBreakdownResult {
    const { monthlyPaidValue, smmlv } = params;
    const daysWorked = params.daysWorked !== undefined ? params.daysWorked : 30;

    if (daysWorked < 0 || daysWorked > 30) {
      throw new BadRequestException(
        'Los días laborados deben estar entre 0 y 30.',
      );
    }

    if (monthlyPaidValue < 0) {
      throw new BadRequestException(
        'El valor mensual pagado no puede ser negativo.',
      );
    }

    // 1. Proportional values based on days worked (Standard 30-day labor month)
    const factor = daysWorked / 30.0;
    const proportionalPaidValue =
      Math.round(monthlyPaidValue * factor * 100) / 100;
    const proportionalSmmlv = Math.round(smmlv * factor * 100) / 100;

    // If paid value is less than or equal to SMMLV, base salary takes the whole amount, excess is 0
    if (
      proportionalPaidValue <= proportionalSmmlv ||
      params.items.length === 0
    ) {
      return {
        daysWorked,
        baseSalary: proportionalPaidValue,
        excessDistributed: 0,
        totalGrossPay: proportionalPaidValue,
        breakdownItems: [],
      };
    }

    // 2. Validate that percentages sum to 100.00% (with tolerance of 0.01%)
    const totalPercentage = params.items.reduce(
      (acc, curr) => acc + Number(curr.percentage),
      0,
    );
    if (Math.abs(totalPercentage - 100.0) > 0.05) {
      throw new BadRequestException(
        `Los porcentajes de la modalidad deben sumar 100.00%. Suma actual: ${totalPercentage.toFixed(2)}%`,
      );
    }

    // 3. Excess to distribute among supplementary concepts
    const excessToDistribute =
      Math.round((proportionalPaidValue - proportionalSmmlv) * 100) / 100;

    let sumAllocated = 0;
    const results: BreakdownItemResult[] = params.items.map((item) => {
      const allocated =
        Math.round(
          excessToDistribute * (Number(item.percentage) / 100.0) * 100,
        ) / 100;
      sumAllocated += allocated;
      return {
        conceptId: item.conceptId,
        conceptCode: item.conceptCode,
        conceptName: item.conceptName,
        percentage: Number(item.percentage),
        calculatedValue: allocated,
      };
    });

    // 4. Cent rounding adjustment (ensure sum of allocated equals excessToDistribute exactly)
    const centDifference =
      Math.round((excessToDistribute - sumAllocated) * 100) / 100;
    if (Math.abs(centDifference) > 0 && results.length > 0) {
      // Find item with largest percentage to absorb rounding cent
      const maxItem = results.reduce(
        (prev, curr) => (curr.percentage > prev.percentage ? curr : prev),
        results[0],
      );
      maxItem.calculatedValue =
        Math.round((maxItem.calculatedValue + centDifference) * 100) / 100;
    }

    return {
      daysWorked,
      baseSalary: proportionalSmmlv,
      excessDistributed: excessToDistribute,
      totalGrossPay: proportionalPaidValue,
      breakdownItems: results,
    };
  }
}
