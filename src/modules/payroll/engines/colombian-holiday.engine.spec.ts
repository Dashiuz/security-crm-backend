import { ColombianHolidayEngine } from './colombian-holiday.engine';

describe('ColombianHolidayEngine', () => {
  let engine: ColombianHolidayEngine;

  beforeEach(() => {
    engine = new ColombianHolidayEngine();
  });

  it('should compute exactly 18 statutory holidays for 2026', () => {
    const holidays2026 = engine.getHolidaysForYear(2026);
    expect(holidays2026).toHaveLength(18);

    // Easter in 2026 is April 5th
    const easter2026 = engine.getEasterSunday(2026);
    expect(easter2026.getUTCFullYear()).toBe(2026);
    expect(easter2026.getUTCMonth()).toBe(3); // April is index 3
    expect(easter2026.getUTCDate()).toBe(5);

    // Jueves Santo: April 2, 2026
    const juevesSanto = holidays2026.find((h) => h.name === 'Jueves Santo');
    expect(juevesSanto?.dateStr).toBe('2026-04-02');

    // Viernes Santo: April 3, 2026
    const viernesSanto = holidays2026.find((h) => h.name === 'Viernes Santo');
    expect(viernesSanto?.dateStr).toBe('2026-04-03');

    // Ascensión del Señor (Easter + 40 -> Next Monday -> May 18, 2026)
    const ascension = holidays2026.find(
      (h) => h.name === 'Ascensión del Señor',
    );
    expect(ascension?.dateStr).toBe('2026-05-18');

    // Fixed inamovible: May 1, 2026
    const trabajo = holidays2026.find((h) => h.name === 'Día del Trabajo');
    expect(trabajo?.dateStr).toBe('2026-05-01');

    // Fixed Emiliani: Reyes Magos (Jan 6, 2026 is Tuesday -> Monday Jan 12, 2026)
    const reyes = holidays2026.find((h) => h.name === 'Reyes Magos');
    expect(reyes?.dateStr).toBe('2026-01-12');
  });

  it('should compute exactly 18 statutory holidays for 2025', () => {
    const holidays2025 = engine.getHolidaysForYear(2025);
    expect(holidays2025).toHaveLength(18);

    // Easter 2025 is April 20th
    const easter2025 = engine.getEasterSunday(2025);
    expect(easter2025.getUTCMonth()).toBe(3);
    expect(easter2025.getUTCDate()).toBe(20);

    // Jueves Santo: April 17, 2025
    expect(holidays2025.find((h) => h.name === 'Jueves Santo')?.dateStr).toBe(
      '2025-04-17',
    );
    // Viernes Santo: April 18, 2025
    expect(holidays2025.find((h) => h.name === 'Viernes Santo')?.dateStr).toBe(
      '2025-04-18',
    );
  });

  it('should correctly identify holiday status for given dates', () => {
    expect(engine.isHoliday('2026-01-01')).toBe(true);
    expect(engine.isHoliday('2026-01-02')).toBe(false);
    expect(engine.isHoliday('2026-05-01')).toBe(true);
    expect(engine.isHoliday('2026-07-20')).toBe(true);
    expect(engine.isHoliday('2026-12-25')).toBe(true);
  });
});
