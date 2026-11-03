import { Injectable, Logger } from '@nestjs/common';

export interface CalculatedHoliday {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  name: string;
  isNational: boolean;
  category: 'FIXED' | 'EASTER_FIXED' | 'EMILIANI_FIXED' | 'EMILIANI_EASTER';
}

@Injectable()
export class ColombianHolidayEngine {
  private readonly logger = new Logger(ColombianHolidayEngine.name);

  /**
   * Computes the Easter Sunday (Domingo de Resurrección) for any Gregorian year
   * using Meeus/Butcher's algorithm.
   */
  public getEasterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(Date.UTC(year, month - 1, day));
  }

  /**
   * Returns all 18 official Colombian statutory holidays for a given year
   * in chronological order according to Ley 51 de 1983 (Ley Emiliani).
   */
  public getHolidaysForYear(year: number): CalculatedHoliday[] {
    const easter = this.getEasterSunday(year);

    const addDays = (base: Date, days: number): Date => {
      const result = new Date(base.getTime());
      result.setUTCDate(result.getUTCDate() + days);
      return result;
    };

    const toNextMonday = (base: Date): Date => {
      const dayOfWeek = base.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      if (dayOfWeek === 1) return base;
      const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      return addDays(base, daysToAdd);
    };

    const createUtcDate = (y: number, m: number, d: number): Date => {
      return new Date(Date.UTC(y, m - 1, d));
    };

    const formatIso = (d: Date): string => {
      return d.toISOString().split('T')[0];
    };

    const holidays: CalculatedHoliday[] = [
      // 1. Fechas fijas inamovibles (6 días)
      {
        date: createUtcDate(year, 1, 1),
        dateStr: formatIso(createUtcDate(year, 1, 1)),
        name: 'Año Nuevo',
        isNational: true,
        category: 'FIXED',
      },
      {
        date: createUtcDate(year, 5, 1),
        dateStr: formatIso(createUtcDate(year, 5, 1)),
        name: 'Día del Trabajo',
        isNational: true,
        category: 'FIXED',
      },
      {
        date: createUtcDate(year, 7, 20),
        dateStr: formatIso(createUtcDate(year, 7, 20)),
        name: 'Día de la Independencia',
        isNational: true,
        category: 'FIXED',
      },
      {
        date: createUtcDate(year, 8, 7),
        dateStr: formatIso(createUtcDate(year, 8, 7)),
        name: 'Batalla de Boyacá',
        isNational: true,
        category: 'FIXED',
      },
      {
        date: createUtcDate(year, 12, 8),
        dateStr: formatIso(createUtcDate(year, 12, 8)),
        name: 'Inmaculada Concepción',
        isNational: true,
        category: 'FIXED',
      },
      {
        date: createUtcDate(year, 12, 25),
        dateStr: formatIso(createUtcDate(year, 12, 25)),
        name: 'Navidad',
        isNational: true,
        category: 'FIXED',
      },

      // 2. Pascua inamovibles (2 días)
      {
        date: addDays(easter, -3),
        dateStr: formatIso(addDays(easter, -3)),
        name: 'Jueves Santo',
        isNational: true,
        category: 'EASTER_FIXED',
      },
      {
        date: addDays(easter, -2),
        dateStr: formatIso(addDays(easter, -2)),
        name: 'Viernes Santo',
        isNational: true,
        category: 'EASTER_FIXED',
      },

      // 3. Pascua trasladables al siguiente lunes (Ley Emiliani) (3 días)
      {
        date: toNextMonday(addDays(easter, 40)),
        dateStr: formatIso(toNextMonday(addDays(easter, 40))),
        name: 'Ascensión del Señor',
        isNational: true,
        category: 'EMILIANI_EASTER',
      },
      {
        date: toNextMonday(addDays(easter, 60)),
        dateStr: formatIso(toNextMonday(addDays(easter, 60))),
        name: 'Corpus Christi',
        isNational: true,
        category: 'EMILIANI_EASTER',
      },
      {
        date: toNextMonday(addDays(easter, 68)),
        dateStr: formatIso(toNextMonday(addDays(easter, 68))),
        name: 'Sagrado Corazón de Jesús',
        isNational: true,
        category: 'EMILIANI_EASTER',
      },

      // 4. Fijos trasladables al siguiente lunes (Ley Emiliani) (7 días)
      {
        date: toNextMonday(createUtcDate(year, 1, 6)),
        dateStr: formatIso(toNextMonday(createUtcDate(year, 1, 6))),
        name: 'Reyes Magos',
        isNational: true,
        category: 'EMILIANI_FIXED',
      },
      {
        date: toNextMonday(createUtcDate(year, 3, 19)),
        dateStr: formatIso(toNextMonday(createUtcDate(year, 3, 19))),
        name: 'San José',
        isNational: true,
        category: 'EMILIANI_FIXED',
      },
      {
        date: toNextMonday(createUtcDate(year, 6, 29)),
        dateStr: formatIso(toNextMonday(createUtcDate(year, 6, 29))),
        name: 'San Pedro y San Pablo',
        isNational: true,
        category: 'EMILIANI_FIXED',
      },
      {
        date: toNextMonday(createUtcDate(year, 8, 15)),
        dateStr: formatIso(toNextMonday(createUtcDate(year, 8, 15))),
        name: 'Asunción de la Virgen',
        isNational: true,
        category: 'EMILIANI_FIXED',
      },
      {
        date: toNextMonday(createUtcDate(year, 10, 12)),
        dateStr: formatIso(toNextMonday(createUtcDate(year, 10, 12))),
        name: 'Día de la Raza',
        isNational: true,
        category: 'EMILIANI_FIXED',
      },
      {
        date: toNextMonday(createUtcDate(year, 11, 1)),
        dateStr: formatIso(toNextMonday(createUtcDate(year, 11, 1))),
        name: 'Todos los Santos',
        isNational: true,
        category: 'EMILIANI_FIXED',
      },
      {
        date: toNextMonday(createUtcDate(year, 11, 11)),
        dateStr: formatIso(toNextMonday(createUtcDate(year, 11, 11))),
        name: 'Independencia de Cartagena',
        isNational: true,
        category: 'EMILIANI_FIXED',
      },
    ];

    return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Evaluates if a given date string (YYYY-MM-DD) or Date is a Colombian holiday.
   */
  public isHoliday(
    date: Date | string,
    holidayList?: CalculatedHoliday[],
  ): boolean {
    const dStr =
      typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const year = parseInt(dStr.split('-')[0], 10);
    const list = holidayList || this.getHolidaysForYear(year);
    return list.some((h) => h.dateStr === dStr);
  }
}
