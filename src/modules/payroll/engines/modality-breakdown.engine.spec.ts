import { ModalityBreakdownEngine } from './modality-breakdown.engine';
import { BadRequestException } from '@nestjs/common';

describe('ModalityBreakdownEngine', () => {
  let engine: ModalityBreakdownEngine;

  beforeEach(() => {
    engine = new ModalityBreakdownEngine();
  });

  const sampleItems = [
    {
      conceptId: 'c2',
      conceptCode: 2,
      conceptName: 'Recargo Nocturno',
      percentage: 35.9,
    },
    {
      conceptId: 'c4',
      conceptCode: 4,
      conceptName: 'Horas Extras Nocturnas',
      percentage: 29.14,
    },
    {
      conceptId: 'c5',
      conceptCode: 5,
      conceptName: 'Recargo Festivo',
      percentage: 10.98,
    },
    {
      conceptId: 'c8',
      conceptCode: 8,
      conceptName: 'H. Extras Festivas Nocturnas',
      percentage: 13.98,
    },
    {
      conceptId: 'c6',
      conceptCode: 6,
      conceptName: 'Dominical con Descanso',
      percentage: 10.0,
    },
  ];

  it('should accurately distribute excess above SMMLV for 30 days', () => {
    const smmlv = 1750905.0;
    const monthlyPaidValue = 2450000.0; // Excess = 699,095.00

    const result = engine.calculateBreakdown({
      monthlyPaidValue,
      smmlv,
      daysWorked: 30,
      items: sampleItems,
    });

    expect(result.daysWorked).toBe(30);
    expect(result.baseSalary).toBe(smmlv);
    expect(result.totalGrossPay).toBe(monthlyPaidValue);
    expect(result.excessDistributed).toBe(699095.0);

    const sumBreakdown = result.breakdownItems.reduce(
      (acc, curr) => acc + curr.calculatedValue,
      0,
    );
    expect(Math.round(sumBreakdown * 100) / 100).toBe(result.excessDistributed);
    expect(result.baseSalary + sumBreakdown).toBe(monthlyPaidValue);
  });

  it('should compute proportional values for 15 days (quincena)', () => {
    const smmlv = 1750905.0;
    const monthlyPaidValue = 2450000.0;

    const result = engine.calculateBreakdown({
      monthlyPaidValue,
      smmlv,
      daysWorked: 15,
      items: sampleItems,
    });

    expect(result.daysWorked).toBe(15);
    expect(result.baseSalary).toBe(875452.5);
    expect(result.totalGrossPay).toBe(1225000.0);
    expect(result.excessDistributed).toBe(349547.5);

    const sumBreakdown = result.breakdownItems.reduce(
      (acc, curr) => acc + curr.calculatedValue,
      0,
    );
    expect(Math.round(sumBreakdown * 100) / 100).toBe(result.excessDistributed);
    expect(result.baseSalary + sumBreakdown).toBe(result.totalGrossPay);
  });

  it('should return 0 excess if monthlyPaidValue equals or is below SMMLV', () => {
    const smmlv = 1750905.0;
    const result = engine.calculateBreakdown({
      monthlyPaidValue: 1750905.0,
      smmlv,
      daysWorked: 30,
      items: sampleItems,
    });

    expect(result.baseSalary).toBe(smmlv);
    expect(result.excessDistributed).toBe(0);
    expect(result.breakdownItems).toHaveLength(0);
  });

  it('should throw BadRequestException if modality percentages do not sum to 100%', () => {
    const invalidItems = [
      {
        conceptId: 'c2',
        conceptCode: 2,
        conceptName: 'Recargo Nocturno',
        percentage: 50.0,
      },
      {
        conceptId: 'c4',
        conceptCode: 4,
        conceptName: 'Horas Extras Nocturnas',
        percentage: 20.0,
      },
    ];

    expect(() =>
      engine.calculateBreakdown({
        monthlyPaidValue: 2450000.0,
        smmlv: 1750905.0,
        daysWorked: 30,
        items: invalidItems,
      }),
    ).toThrow(BadRequestException);
  });

  it('should throw BadRequestException if days worked is invalid', () => {
    expect(() =>
      engine.calculateBreakdown({
        monthlyPaidValue: 2450000.0,
        smmlv: 1750905.0,
        daysWorked: 35,
        items: sampleItems,
      }),
    ).toThrow(BadRequestException);
  });
});
