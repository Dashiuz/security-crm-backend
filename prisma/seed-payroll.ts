import {
  PrismaClient,
  PayrollPaymentFrequency,
  PayrollAdvanceMode,
  PayrollConceptNature,
  PayrollProportionality,
  SocialSecurityEntityType,
  ArlRiskClass,
  DependencySettlementType,
  ShiftModalityClass,
} from '@prisma/client';

export function getColombianHolidays(year: number): Array<{ date: Date; name: string }> {
  // 1. Easter Sunday calculation via Butcher's Gregorian algorithm
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easter = new Date(Date.UTC(year, month - 1, day));

  const addDays = (base: Date, days: number): Date => {
    const res = new Date(base.getTime());
    res.setUTCDate(res.getUTCDate() + days);
    return res;
  };

  const toNextMonday = (base: Date): Date => {
    const dayOfWeek = base.getUTCDay(); // 0 = Sun, 1 = Mon
    if (dayOfWeek === 1) return base;
    const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    return addDays(base, daysToAdd);
  };

  const createDate = (y: number, m: number, d: number): Date => {
    return new Date(Date.UTC(y, m - 1, d));
  };

  return [
    // Fijos inamovibles (6)
    { date: createDate(year, 1, 1), name: 'Año Nuevo' },
    { date: createDate(year, 5, 1), name: 'Día del Trabajo' },
    { date: createDate(year, 7, 20), name: 'Día de la Independencia' },
    { date: createDate(year, 8, 7), name: 'Batalla de Boyacá' },
    { date: createDate(year, 12, 8), name: 'Inmaculada Concepción' },
    { date: createDate(year, 12, 25), name: 'Navidad' },

    // Pascua inamovibles (2)
    { date: addDays(easter, -3), name: 'Jueves Santo' },
    { date: addDays(easter, -2), name: 'Viernes Santo' },

    // Pascua trasladables al siguiente lunes (3)
    { date: toNextMonday(addDays(easter, 40)), name: 'Ascensión del Señor' },
    { date: toNextMonday(addDays(easter, 60)), name: 'Corpus Christi' },
    { date: toNextMonday(addDays(easter, 68)), name: 'Sagrado Corazón de Jesús' },

    // Fijos trasladables al siguiente lunes (Ley Emiliani) (7)
    { date: toNextMonday(createDate(year, 1, 6)), name: 'Reyes Magos' },
    { date: toNextMonday(createDate(year, 3, 19)), name: 'San José' },
    { date: toNextMonday(createDate(year, 6, 29)), name: 'San Pedro y San Pablo' },
    { date: toNextMonday(createDate(year, 8, 15)), name: 'Asunción de la Virgen' },
    { date: toNextMonday(createDate(year, 10, 12)), name: 'Día de la Raza' },
    { date: toNextMonday(createDate(year, 11, 1)), name: 'Todos los Santos' },
    { date: toNextMonday(createDate(year, 11, 11)), name: 'Independencia de Cartagena' },
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function seedPayroll(prisma: PrismaClient, tenantIds: string[]) {
  console.log('Seeding Payroll Foundations & Catalogs (SPEC-ADM-028)...');

  for (const tenantId of tenantIds) {
    const tenantRecord = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { profile: true },
    });
    const companyLegalName =
      tenantId === 'system'
        ? 'NOXIA Master System S.A.S.'
        : tenantRecord?.profile?.legalName || tenantRecord?.name || 'Seguridad Privada';
    const companyNit =
      tenantId === 'system'
        ? '900000000'
        : tenantRecord?.profile?.taxId?.split('-')[0] || '800123456';

    // 1. PayrollSettings
    await prisma.payrollSettings.upsert({
      where: { tenantId },
      update: {},
      create: {
        tenantId,
        companyLegalName,
        companyNit,
        companyDv: '9',
        daneCityCode: '11001',
        daneCityName: 'BOGOTÁ D.C.',
        daneDepartmentCode: '11',
        daneDepartmentName: 'BOGOTÁ D.C.',
        activeYear: 2026,
        smmlv: 1750905.0,
        transportAllowance: 249095.0,
        uvtValue: 49799.0,
        weeklyWorkingHours: 44,
        monthlyDivisorHours: 220,
        paymentFrequency: PayrollPaymentFrequency.MONTHLY_WITH_ADVANCE,
        advanceMode: PayrollAdvanceMode.PERCENTAGE_OF_BASE,
        defaultAdvancePct: 0.4,
        deductAbsencesInAdvance: true,
        saturdayIsWorkingDay: true,
        applyExonerationLaw1607: true,
        enforceUgpp40PctRule: true,
        normalHourFactorPct: 100.0,
        nightSurchargePct: 35.0,
        extraDayPct: 125.0,
        extraNightPct: 175.0,
        sundayCompensatedPct: 80.0,
        holidaySurchargePct: 80.0,
        extraHolidayDayPct: 205.0,
        extraHolidayNightPct: 255.0,
        employeeHealthPct: 4.0,
        employeePensionPct: 4.0,
        fspBasePct: 1.0,
        employerHealthPct: 8.5,
        employerPensionPct: 12.0,
        ccfPct: 4.0,
        senaPct: 2.0,
        icbfPct: 3.0,
      },
    });

    // 2. Holidays for 2025, 2026 and 2027
    const years = [2025, 2026, 2027];
    for (const year of years) {
      const holidays = getColombianHolidays(year);
      for (const h of holidays) {
        await prisma.payrollHoliday.upsert({
          where: { tenantId_date: { tenantId, date: h.date } },
          update: { name: h.name, year },
          create: {
            tenantId,
            date: h.date,
            year,
            name: h.name,
            isNational: true,
          },
        });
      }
    }

    // 3. Branches
    const branches = [
      { code: 1, name: 'BOGOTA D.C.', daneCityCode: '11001', pilaBranchCode: '01' },
      { code: 2, name: 'MEDELLIN', daneCityCode: '05001', pilaBranchCode: '02' },
      { code: 3, name: 'CALI', daneCityCode: '76001', pilaBranchCode: '03' },
      { code: 4, name: 'BARRANQUILLA', daneCityCode: '08001', pilaBranchCode: '04' },
      { code: 5, name: 'BUCARAMANGA', daneCityCode: '68001', pilaBranchCode: '05' },
    ];
    const seededBranchMap: Record<number, string> = {};
    for (const b of branches) {
      const branch = await prisma.payrollBranch.upsert({
        where: { tenantId_code: { tenantId, code: b.code } },
        update: { name: b.name },
        create: { ...b, tenantId },
      });
      seededBranchMap[b.code] = branch.id;
    }

    // 4. Banks
    const banks = [
      { code: '1007', name: 'BANCOLOMBIA', achCode: '007', exportFormat: 'PAB_BANCOLOMBIA' },
      { code: '1051', name: 'BANCO DAVIVIENDA', achCode: '051', exportFormat: 'DAVIVIENDA' },
      { code: '1032', name: 'BANCO CAJA SOCIAL (BCSC)', achCode: '032', exportFormat: 'BCSC' },
      { code: '1001', name: 'BANCO DE BOGOTA', achCode: '001', exportFormat: 'BOGOTA' },
      { code: '1023', name: 'BANCO DE OCCIDENTE', achCode: '023', exportFormat: 'OCCIDENTE' },
      { code: '1013', name: 'BBVA COLOMBIA', achCode: '013', exportFormat: 'BBVA' },
    ];
    for (const bk of banks) {
      await prisma.payrollBank.upsert({
        where: { tenantId_code: { tenantId, code: bk.code } },
        update: { name: bk.name, achCode: bk.achCode, exportFormat: bk.exportFormat },
        create: { ...bk, tenantId },
      });
    }

    // 5. Social Security Entities (EPS, AFP, CCF, ARL)
    const entities = [
      // EPS
      { code: 'EPS010', name: 'EPS SURA', entityType: SocialSecurityEntityType.EPS, nit: '800088702', pluCode: 'EPS010', legacyConceptCode: 611 },
      { code: 'EPS005', name: 'SANITAS EPS', entityType: SocialSecurityEntityType.EPS, nit: '800251440', pluCode: 'EPS005', legacyConceptCode: 612 },
      { code: 'EPS037', name: 'NUEVA EPS', entityType: SocialSecurityEntityType.EPS, nit: '900156264', pluCode: 'EPS037', legacyConceptCode: 606 },
      { code: 'EPS008', name: 'COMPENSAR EPS', entityType: SocialSecurityEntityType.EPS, nit: '860066942', pluCode: 'EPS008', legacyConceptCode: 648 },
      { code: 'EPS002', name: 'SALUD TOTAL EPS', entityType: SocialSecurityEntityType.EPS, nit: '800130907', pluCode: 'EPS002', legacyConceptCode: 604 },
      // AFP
      { code: 'AFP001', name: 'PORVENIR AFP', entityType: SocialSecurityEntityType.AFP, nit: '800144897', pluCode: '230301', legacyConceptCode: 602 },
      { code: 'AFP002', name: 'PROTECCION AFP', entityType: SocialSecurityEntityType.AFP, nit: '800229739', pluCode: '230201', legacyConceptCode: 605 },
      { code: 'AFP003', name: 'COLPENSIONES', entityType: SocialSecurityEntityType.AFP, nit: '900336004', pluCode: '25-14', legacyConceptCode: 601 },
      // CCF
      { code: 'CCF09', name: 'COMPENSAR CCF', entityType: SocialSecurityEntityType.CCF, nit: '860066942', pluCode: 'CCF09' },
      { code: 'CCF21', name: 'COLSUBSIDIO CCF', entityType: SocialSecurityEntityType.CCF, nit: '860007336', pluCode: 'CCF21' },
      { code: 'CCF18', name: 'CAFAM CCF', entityType: SocialSecurityEntityType.CCF, nit: '860013570', pluCode: 'CCF18' },
      // ARL
      { code: 'ARL01', name: 'ARL SURA', entityType: SocialSecurityEntityType.ARL, nit: '890903407', pluCode: '14-28' },
      { code: 'ARL02', name: 'POSITIVA COMPAÑIA DE SEGUROS', entityType: SocialSecurityEntityType.ARL, nit: '860011153', pluCode: '14-23' },
    ];
    for (const ent of entities) {
      await prisma.payrollEntity.upsert({
        where: { tenantId_code: { tenantId, code: ent.code } },
        update: { name: ent.name, nit: ent.nit, pluCode: ent.pluCode, legacyConceptCode: ent.legacyConceptCode },
        create: { ...ent, tenantId },
      });
    }

    // 6. Exit Reasons (Pronos 1.14)
    const exitReasons = [
      { code: 1, name: 'Renuncia Voluntaria', isJustCause: false },
      { code: 2, name: 'Terminación por Justa Causa (Falta Grave / Disciplinaria)', isJustCause: true },
      { code: 3, name: 'Terminación sin Justa Causa (Indemnización Art. 64 CST)', isJustCause: false },
      { code: 4, name: 'Vencimiento del Término Pactado / Fin de Obra', isJustCause: false },
      { code: 5, name: 'Muerte del Trabajador', isJustCause: false },
      { code: 6, name: 'Mutuo Acuerdo / Conciliación Laboral', isJustCause: false },
      { code: 7, name: 'Liquidación o Clausura Definitiva de la Empresa', isJustCause: false },
      { code: 8, name: 'Suspensión de Actividades por más de 120 días', isJustCause: false },
      { code: 9, name: 'Jubilación o Pensión de Vejez / Invalidez', isJustCause: false },
    ];
    for (const ex of exitReasons) {
      await prisma.payrollExitReason.upsert({
        where: { tenantId_code: { tenantId, code: ex.code } },
        update: { name: ex.name, isJustCause: ex.isJustCause },
        create: { ...ex, tenantId },
      });
    }

    // 7. Hiring Requirements (Pronos 1.5)
    const requirements = [
      { code: 1, name: 'Cédula de Ciudadanía', isMandatory: true, hasExpiry: false },
      { code: 2, name: 'Libreta Militar / Certificado Situación Militar', isMandatory: true, hasExpiry: false },
      { code: 3, name: 'Examen Médico de Ingreso Ocupacional', isMandatory: true, hasExpiry: true },
      { code: 4, name: 'Examen Médico Psicofísico de Porte y Tenencia de Armas', isMandatory: true, hasExpiry: true },
      { code: 5, name: 'Certificado Curso de Capacitación SVSP Vigente', isMandatory: true, hasExpiry: true },
      { code: 6, name: 'Certificados de Antecedentes (Policía, Procuraduría, Contraloría)', isMandatory: true, hasExpiry: false },
      { code: 7, name: 'Certificado de Afiliación EPS y Fondo de Pensiones', isMandatory: true, hasExpiry: false },
    ];
    for (const req of requirements) {
      await prisma.payrollHiringRequirement.upsert({
        where: { tenantId_code: { tenantId, code: req.code } },
        update: { name: req.name, isMandatory: req.isMandatory, hasExpiry: req.hasExpiry },
        create: { ...req, tenantId },
      });
    }

    // 8. SVSP Levels (Pronos 5.3)
    const svspLevels = [
      { code: '1101', name: 'FUNDAMENTACION VIGILANCIA', validityDays: 365 },
      { code: '1102', name: 'REENTRENAMIENTO VIGILANCIA', validityDays: 365 },
      { code: '1103', name: 'ESPECIALIZACION VIGILANCIA (SECTORIAL)', validityDays: 365 },
      { code: '1201', name: 'FUNDAMENTACION ESCOLTA', validityDays: 365 },
      { code: '1202', name: 'REENTRENAMIENTO ESCOLTA', validityDays: 365 },
      { code: '1301', name: 'FUNDAMENTACION MANEJADOR CANINO', validityDays: 365 },
      { code: '1302', name: 'REENTRENAMIENTO MANEJADOR CANINO', validityDays: 365 },
      { code: '1308', name: 'FUNDAMENTACION MEDIOS TECNOLOGICOS (CCTV)', validityDays: 365 },
      { code: '1309', name: 'REENTRENAMIENTO MEDIOS TECNOLOGICOS', validityDays: 365 },
    ];
    for (const lvl of svspLevels) {
      await prisma.payrollSvspLevel.upsert({
        where: { tenantId_code: { tenantId, code: lvl.code } },
        update: { name: lvl.name, validityDays: lvl.validityDays },
        create: { ...lvl, tenantId },
      });
    }

    // 9. Standard Concepts (Pronos Catalogs with PUC, NIE & 10 Base Tables)
    const concepts = [
      {
        code: 1,
        name: 'SUELDO BASICO',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.DAYS,
        isDeletableOnLiquidation: false,
        isConstitutiveOfSalary: true,
        adminPucAccount: '510506',
        operativePucAccount: '720506',
        dianNieCode: 'NIE070',
        dianNieFieldName: 'SueldoTrabajado',
        inLiq: true,
        inPri: true,
        inTis: true,
        inVac: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
      },
      {
        code: 2,
        name: 'RECARGO NOCTURNO (35%)',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.HOURS,
        defaultRatePct: 35.0,
        isConstitutiveOfSalary: true,
        adminPucAccount: '510515',
        operativePucAccount: '720515',
        dianNieCode: 'NIE078',
        dianNieFieldName: 'HED',
        inLiq: true,
        inPri: true,
        inTis: true,
        inVac: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
        inLhex: true,
      },
      {
        code: 3,
        name: 'HORAS EXTRAS DIURNAS (125%)',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.HOURS,
        defaultRatePct: 125.0,
        isConstitutiveOfSalary: true,
        adminPucAccount: '510515',
        operativePucAccount: '720515',
        dianNieCode: 'NIE078',
        inLiq: true,
        inPri: true,
        inTis: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
        inLhex: true,
      },
      {
        code: 4,
        name: 'HORAS EXTRAS NOCTURNAS (175%)',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.HOURS,
        defaultRatePct: 175.0,
        isConstitutiveOfSalary: true,
        adminPucAccount: '510515',
        operativePucAccount: '720515',
        dianNieCode: 'NIE078',
        inLiq: true,
        inPri: true,
        inTis: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
        inLhex: true,
      },
      {
        code: 5,
        name: 'RECARGO FESTIVO (80%)',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.HOURS,
        defaultRatePct: 80.0,
        isConstitutiveOfSalary: true,
        adminPucAccount: '510515',
        operativePucAccount: '720515',
        dianNieCode: 'NIE078',
        inLiq: true,
        inPri: true,
        inTis: true,
        inVac: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
        inLhex: true,
      },
      {
        code: 6,
        name: 'DOMINICAL CON DESCANSO (80%)',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.HOURS,
        defaultRatePct: 80.0,
        isConstitutiveOfSalary: true,
        adminPucAccount: '510515',
        operativePucAccount: '720515',
        dianNieCode: 'NIE078',
        inLiq: true,
        inPri: true,
        inTis: true,
        inVac: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
        inLhex: true,
      },
      {
        code: 7,
        name: 'RECARGO FESTIVO NOCTURNO (110%)',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.HOURS,
        defaultRatePct: 110.0,
        isConstitutiveOfSalary: true,
        adminPucAccount: '510515',
        operativePucAccount: '720515',
        dianNieCode: 'NIE078',
        inLiq: true,
        inPri: true,
        inTis: true,
        inVac: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
        inLhex: true,
      },
      {
        code: 8,
        name: 'H. EXTRAS FESTIVAS NOCTURNAS (255%)',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.HOURS,
        defaultRatePct: 255.0,
        isConstitutiveOfSalary: true,
        adminPucAccount: '510515',
        operativePucAccount: '720515',
        dianNieCode: 'NIE078',
        inLiq: true,
        inPri: true,
        inTis: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
        inLhex: true,
      },
      {
        code: 9,
        name: 'H. EXTRAS FESTIVAS DIURNAS (205%)',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.HOURS,
        defaultRatePct: 205.0,
        isConstitutiveOfSalary: true,
        adminPucAccount: '510515',
        operativePucAccount: '720515',
        dianNieCode: 'NIE078',
        inLiq: true,
        inPri: true,
        inTis: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
        inLhex: true,
      },
      {
        code: 10,
        name: 'AUXILIO DE TRANSPORTE LEGAL',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.DAYS,
        isConstitutiveOfSalary: false,
        adminPucAccount: '510527',
        operativePucAccount: '720527',
        dianNieCode: 'NIE071',
        dianNieFieldName: 'AuxilioTransporte',
        inLiq: true,
        inPri: true,
        inCes: true,
      },
      {
        code: 11,
        name: 'PRIMA LEGAL DE SERVICIOS',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        isConstitutiveOfSalary: false,
        adminPucAccount: '510536',
        operativePucAccount: '720536',
        dianNieCode: 'NIE085',
      },
      {
        code: 12,
        name: 'VACACIONES DISFRUTADAS',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.DAYS,
        isConstitutiveOfSalary: true,
        adminPucAccount: '510539',
        operativePucAccount: '720539',
        dianNieCode: 'NIE086',
        inTis: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
      },
      {
        code: 14,
        name: 'CESANTIAS',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        isConstitutiveOfSalary: false,
        adminPucAccount: '510530',
        operativePucAccount: '720530',
        dianNieCode: 'NIE087',
      },
      {
        code: 15,
        name: 'INTERESES SOBRE CESANTIAS',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        isConstitutiveOfSalary: false,
        adminPucAccount: '510533',
        operativePucAccount: '720533',
        dianNieCode: 'NIE088',
      },
      {
        code: 20,
        name: 'BONIFICACION MERA LIBERALIDAD (NO SALARIAL)',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        isConstitutiveOfSalary: false,
        inUgpp40Pct: true,
        adminPucAccount: '510548',
        operativePucAccount: '720548',
        dianNieCode: 'NIE095',
      },
      {
        code: 21,
        name: 'AUXILIO DE RODAMIENTO (NO SALARIAL)',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        isConstitutiveOfSalary: false,
        inUgpp40Pct: true,
        adminPucAccount: '510549',
        operativePucAccount: '720549',
        dianNieCode: 'NIE096',
      },
      {
        code: 100,
        name: 'INCAPACIDAD ENFERMEDAD GENERAL (66.67%)',
        nature: PayrollConceptNature.INCAPACIDAD,
        proportionality: PayrollProportionality.DAYS,
        shiftCodeMap: 'INC',
        isConstitutiveOfSalary: false,
        adminPucAccount: '510518',
        operativePucAccount: '720518',
        dianNieCode: 'NIE100',
        inLiq: true,
        inPri: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
      },
      {
        code: 101,
        name: 'INCAPACIDAD ACCIDENTE DE TRABAJO (100%)',
        nature: PayrollConceptNature.INCAPACIDAD,
        proportionality: PayrollProportionality.DAYS,
        shiftCodeMap: 'AT',
        isConstitutiveOfSalary: false,
        adminPucAccount: '510518',
        operativePucAccount: '720518',
        dianNieCode: 'NIE101',
        inLiq: true,
        inPri: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
      },
      {
        code: 102,
        name: 'LICENCIA DE MATERNIDAD / PATERNIDAD',
        nature: PayrollConceptNature.LICENCIA,
        proportionality: PayrollProportionality.DAYS,
        shiftCodeMap: 'LMA',
        isConstitutiveOfSalary: false,
        adminPucAccount: '510518',
        operativePucAccount: '720518',
        dianNieCode: 'NIE102',
        inLiq: true,
        inPri: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
      },
      {
        code: 104,
        name: 'LICENCIA DE LUTO',
        nature: PayrollConceptNature.LICENCIA,
        proportionality: PayrollProportionality.DAYS,
        shiftCodeMap: 'LT',
        isConstitutiveOfSalary: true,
        adminPucAccount: '510518',
        operativePucAccount: '720518',
        dianNieCode: 'NIE104',
        inLiq: true,
        inPri: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
      },
      {
        code: 110,
        name: 'DIA DE LA FAMILIA REMUNERADO (LEY 1857)',
        nature: PayrollConceptNature.LICENCIA,
        proportionality: PayrollProportionality.DAYS,
        shiftCodeMap: 'DF',
        isConstitutiveOfSalary: true,
        adminPucAccount: '510518',
        operativePucAccount: '720518',
        dianNieCode: 'NIE110',
        inLiq: true,
        inPri: true,
        inCes: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
      },
      // Deducciones
      {
        code: 501,
        name: 'PRESTAMO EMPRESA',
        nature: PayrollConceptNature.DEDUCCION,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        creditCounterpartPuc: '136505',
        dianNieCode: 'NIE150',
      },
      {
        code: 502,
        name: 'SANCION DISCIPLINARIA',
        nature: PayrollConceptNature.DEDUCCION,
        proportionality: PayrollProportionality.DAYS,
        shiftCodeMap: 'SAN',
        inLnr: true,
        dianNieCode: 'NIE151',
      },
      {
        code: 503,
        name: 'AUSENCIA NO REMUNERADA',
        nature: PayrollConceptNature.DEDUCCION,
        proportionality: PayrollProportionality.DAYS,
        shiftCodeMap: 'AUS',
        inLnr: true,
        dianNieCode: 'NIE152',
      },
      {
        code: 504,
        name: 'TURNO NO LABORADO',
        nature: PayrollConceptNature.DEDUCCION,
        proportionality: PayrollProportionality.DAYS,
        shiftCodeMap: 'TNL',
        inLnr: true,
        dianNieCode: 'NIE153',
      },
      {
        code: 505,
        name: 'LICENCIA NO REMUNERADA',
        nature: PayrollConceptNature.DEDUCCION,
        proportionality: PayrollProportionality.DAYS,
        shiftCodeMap: 'LNR',
        inLnr: true,
        dianNieCode: 'NIE154',
      },
      {
        code: 506,
        name: 'EMBARGO JUDICIAL ALIMENTARIO',
        nature: PayrollConceptNature.DEDUCCION,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        creditCounterpartPuc: '237010',
        dianNieCode: 'NIE155',
      },
      {
        code: 509,
        name: 'ANTICIPO DE QUINCENA / NOMINA',
        nature: PayrollConceptNature.DEDUCCION,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        creditCounterpartPuc: '136510',
        dianNieCode: 'NIE158',
      },
      // Seguridad Social Empleado
      {
        code: 601,
        name: 'APORTE SALUD EMPLEADO (4%)',
        nature: PayrollConceptNature.SEG_SOCIAL,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        defaultRatePct: 4.0,
        creditCounterpartPuc: '237005',
        dianNieCode: 'NIE160',
        dianNieFieldName: 'Salud',
      },
      {
        code: 602,
        name: 'APORTE PENSION EMPLEADO (4%)',
        nature: PayrollConceptNature.SEG_SOCIAL,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        defaultRatePct: 4.0,
        creditCounterpartPuc: '238030',
        dianNieCode: 'NIE161',
        dianNieFieldName: 'Pension',
      },
      {
        code: 603,
        name: 'FONDO SOLIDARIDAD PENSIONAL (1%)',
        nature: PayrollConceptNature.SEG_SOCIAL,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        defaultRatePct: 1.0,
        creditCounterpartPuc: '238030',
        dianNieCode: 'NIE162',
        dianNieFieldName: 'FondoSP',
      },
    ];

    const seededConceptMap: Record<number, string> = {};
    for (const c of concepts) {
      const concept = await prisma.payrollConcept.upsert({
        where: { tenantId_code: { tenantId, code: c.code } },
        update: {
          name: c.name,
          nature: c.nature,
          proportionality: c.proportionality,
          adminPucAccount: c.adminPucAccount,
          operativePucAccount: c.operativePucAccount,
          creditCounterpartPuc: c.creditCounterpartPuc,
          dianNieCode: c.dianNieCode,
          inLiq: c.inLiq || false,
          inPri: c.inPri || false,
          inTis: c.inTis || false,
          inVac: c.inVac || false,
          inCes: c.inCes || false,
          inIbcEpsAfp: c.inIbcEpsAfp || false,
          inIbcArl: c.inIbcArl || false,
          inIbcCcf: c.inIbcCcf || false,
          inLhex: c.inLhex || false,
          inLnr: c.inLnr || false,
          inUgpp40Pct: c.inUgpp40Pct || false,
        },
        create: {
          ...c,
          tenantId,
          isSystemDefault: true,
        },
      });
      seededConceptMap[c.code] = concept.id;
    }

    // 10. Shift Modalities with Breakdown Percentages (Pronos Modality Formula)
    const rotatingModality = await prisma.payrollShiftModality.upsert({
      where: { tenantId_code: { tenantId, code: 1 } },
      update: { name: 'TURNO 24 HORAS ROTATIVO (2X2X2)' },
      create: {
        tenantId,
        code: 1,
        name: 'TURNO 24 HORAS ROTATIVO (2X2X2)',
        shiftClass: ShiftModalityClass.ROTATING,
        hoursPerShift: 12,
        description: 'Malla operativa 24h con desglose garantizado según Pronos',
      },
    });

    const rotatingItems = [
      { conceptCode: 2, percentage: 35.9, sortOrder: 1 }, // Recargo Nocturno
      { conceptCode: 4, percentage: 29.14, sortOrder: 2 }, // Horas Extras Nocturnas
      { conceptCode: 5, percentage: 10.98, sortOrder: 3 }, // Recargo Festivo
      { conceptCode: 8, percentage: 13.98, sortOrder: 4 }, // H. Extras Festivas Nocturnas
      { conceptCode: 6, percentage: 10.0, sortOrder: 5 }, // Dominical con Descanso
    ];
    for (const item of rotatingItems) {
      const conceptId = seededConceptMap[item.conceptCode];
      if (conceptId) {
        await prisma.payrollModalityItem.upsert({
          where: {
            modalityId_conceptId: {
              modalityId: rotatingModality.id,
              conceptId,
            },
          },
          update: { percentage: item.percentage, sortOrder: item.sortOrder },
          create: {
            tenantId,
            modalityId: rotatingModality.id,
            conceptId,
            percentage: item.percentage,
            sortOrder: item.sortOrder,
          },
        });
      }
    }

    const dayModality = await prisma.payrollShiftModality.upsert({
      where: { tenantId_code: { tenantId, code: 2 } },
      update: { name: 'TURNO 12 HORAS DIURNO (L-S)' },
      create: {
        tenantId,
        code: 2,
        name: 'TURNO 12 HORAS DIURNO (L-S)',
        shiftClass: ShiftModalityClass.DAY_SHIFT,
        hoursPerShift: 12,
        description: 'Turno diurno 12h',
      },
    });

    const dayItems = [
      { conceptCode: 3, percentage: 70.0, sortOrder: 1 }, // Horas Extras Diurnas
      { conceptCode: 5, percentage: 30.0, sortOrder: 2 }, // Recargo Festivo
    ];
    for (const item of dayItems) {
      const conceptId = seededConceptMap[item.conceptCode];
      if (conceptId) {
        await prisma.payrollModalityItem.upsert({
          where: {
            modalityId_conceptId: {
              modalityId: dayModality.id,
              conceptId,
            },
          },
          update: { percentage: item.percentage, sortOrder: item.sortOrder },
          create: {
            tenantId,
            modalityId: dayModality.id,
            conceptId,
            percentage: item.percentage,
            sortOrder: item.sortOrder,
          },
        });
      }
    }

    // 11. Internal Default Dependencies (Pronos 1.11.3)
    const bogotaBranchId = seededBranchMap[1];
    if (bogotaBranchId) {
      const internalDeps = [
        { code: 0, name: '0 - DISPONIBLE (RETEN OPERATIVO)', isInternal: true },
        { code: 1, name: '1 - GERENCIA GENERAL Y ADMINISTRACION', isInternal: true },
        { code: 100, name: '100 - RELEVANTE OPERATIVO', isInternal: true },
      ];

      for (const dep of internalDeps) {
        await prisma.payrollDependency.upsert({
          where: { tenantId_code: { tenantId, code: dep.code } },
          update: { name: dep.name },
          create: {
            tenantId,
            code: dep.code,
            name: dep.name,
            isInternal: true,
            branchId: bogotaBranchId,
            monthlyPaidValue: 1750905.0,
            prestacionalAmount: 1750905.0,
            dailyValue: 58363.5,
            settlementType: DependencySettlementType.BY_AVERAGE_GUARANTEED,
            modalityId: rotatingModality.id,
            arlRiskClass: ArlRiskClass.RISK_IV,
          },
        });
      }
    }
  }

  console.log('✅ Payroll Foundations & Catalogs seeded successfully!');
}

