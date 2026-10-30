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

    // 7.1 CIE-10 Medical Diagnosis Codes
    const cie10Codes = [
      { code: 'J00', familyCode: 'J00-J99', name: 'Rinofaringitis aguda (resfriado común)' },
      { code: 'J069', familyCode: 'J00-J99', name: 'Infección aguda de las vías respiratorias superiores, no especificada' },
      { code: 'A09X', familyCode: 'A00-B99', name: 'Gastroenteritis y colitis de origen no especificado' },
      { code: 'M545', familyCode: 'M00-M99', name: 'Lumbago no especificado (Lumbalgia mecánica)' },
      { code: 'M544', familyCode: 'M00-M99', name: 'Lumbago con ciática' },
      { code: 'S820', familyCode: 'S00-T98', name: 'Fractura de la rótula' },
      { code: 'S934', familyCode: 'S00-T98', name: 'Esguince y desgarro del tobillo' },
      { code: 'K297', familyCode: 'K00-K93', name: 'Gastritis, no especificada' },
      { code: 'B349', familyCode: 'A00-B99', name: 'Infección viral, no especificada' },
      { code: 'R51X', familyCode: 'R00-R99', name: 'Cefalea y dolor de cabeza intenso' },
      { code: 'Z000', familyCode: 'Z00-Z99', name: 'Examen médico general' },
      { code: 'U071', familyCode: 'U00-U49', name: 'COVID-19, virus identificado' },
    ];
    for (const cie of cie10Codes) {
      await prisma.payrollCie10.upsert({
        where: { tenantId_code: { tenantId, code: cie.code } },
        update: { name: cie.name, familyCode: cie.familyCode, isActive: true },
        create: { ...cie, tenantId, isActive: true },
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

    // 8.1 Academias de Seguridad Privada (Pronos 5.2)
    const academies = [
      {
        code: 1,
        name: 'ACADEMIA NACIONAL DE SEGURIDAD PRIVADA (ASONAL)',
        nit: '860012345-1',
        city: 'BOGOTA D.C.',
        phone: '6013344556',
        email: 'contacto@academianacional.edu.co',
        legalRepName: 'DR. CARLOS MENDEZ',
        address: 'CALLE 45 # 13-22',
        isActive: true,
      },
      {
        code: 2,
        name: 'ACADEMIA COLOMBO LATINA DE SEGURIDAD',
        nit: '800054321-2',
        city: 'BOGOTA D.C.',
        phone: '6017890123',
        email: 'info@colombolatina.edu.co',
        legalRepName: 'DRA. MARTHA ROA',
        address: 'CARRERA 15 # 78-45',
        isActive: true,
      },
      {
        code: 3,
        name: 'ESCUELA DE SEGURIDAD PRIVADA DEL ORIENTE',
        nit: '890123456-3',
        city: 'MEDELLIN',
        phone: '6042123456',
        email: 'capacitacion@seguridadoriente.com',
        legalRepName: 'ING. HERNAN URIBE',
        address: 'CALLE 50 # 42-10',
        isActive: true,
      },
      {
        code: 4,
        name: 'CENTRO DE CAPACITACION EN SEGURIDAD PRIVADA ELITE',
        nit: '900112233-4',
        city: 'CALI',
        phone: '6025544332',
        email: 'contacto@seguridadelite.com',
        legalRepName: 'DR. JAIRO VALENCIA',
        address: 'AVENIDA 6N # 24N-15',
        isActive: true,
      },
    ];
    for (const acad of academies) {
      await prisma.payrollSecurityAcademy.upsert({
        where: { tenantId_code: { tenantId, code: acad.code } },
        update: { name: acad.name, nit: acad.nit, city: acad.city },
        create: { ...acad, tenantId },
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

    // 12. Phase 2: Employee Payroll Profiles & SVSP Courses (SPEC-ADM-029)
    const employees = await prisma.employee.findMany({
      where: { tenantId },
      take: 20,
    });

    const eps = await prisma.payrollEntity.findFirst({
      where: { tenantId, entityType: SocialSecurityEntityType.EPS },
    });
    const afp = await prisma.payrollEntity.findFirst({
      where: { tenantId, entityType: SocialSecurityEntityType.AFP },
    });
    const ccf = await prisma.payrollEntity.findFirst({
      where: { tenantId, entityType: SocialSecurityEntityType.CCF },
    });
    const bank = await prisma.payrollBank.findFirst({
      where: { tenantId },
    });
    const defaultDep = await prisma.payrollDependency.findFirst({
      where: { tenantId, code: 0 },
    });
    const svspLevel1101 = await prisma.payrollSvspLevel.findFirst({
      where: { tenantId, code: '1101' },
    });
    const academy = await prisma.payrollSecurityAcademy.findFirst({
      where: { tenantId },
    });
    const reqs = await prisma.payrollHiringRequirement.findMany({
      where: { tenantId },
      take: 4,
    });

    for (const emp of employees) {
      // 12.1 Profile
      const existingProfile = await prisma.employeePayrollProfile.findUnique({
        where: { employeeId: emp.id },
      });

      const contractEnd = new Date();
      contractEnd.setMonth(contractEnd.getMonth() + 6);

      if (!existingProfile) {
        await prisma.employeePayrollProfile.create({
          data: {
            tenantId,
            employeeId: emp.id,
            branchId: bogotaBranchId,
            primaryDependencyId: defaultDep?.id || null,
            contractType: 'FIXED_TERM',
            contractNumber: `CTO-${emp.document}`,
            contractEndDate: contractEnd,
            salaryMode: 'BY_DEPENDENCY',
            customBaseSalary: 1750905.0,
            hasTransportAllowance: true,
            epsEntityId: eps?.id || null,
            afpEntityId: afp?.id || null,
            ccfEntityId: ccf?.id || null,
            cesantiasEntityId: afp?.id || null,
            bankId: bank?.id || null,
            bankAccountType: 'SAVINGS',
            bankAccountNumber: `912${emp.document.slice(-6)}`,
            daneCityCode: '11001',
            daneCityName: 'BOGOTÁ D.C.',
            neighborhood: 'Centro',
            stratum: 2,
            maritalStatus: 'SINGLE',
            bloodType: 'O+',
            educationLevel: 'HIGH_SCHOOL',
            housingType: 'RENTED',
            transportMeans: 'Transporte Público',
            shirtSize: 'M',
            pantsSize: '32',
            footwearSize: '40',
          },
        });
      }

      // 12.2 SVSP Course (Fundamentación 1101 vigente)
      if (svspLevel1101 && academy) {
        const existingCourse = await prisma.employeeSvspCourse.findFirst({
          where: { tenantId, employeeId: emp.id },
        });

        if (!existingCourse) {
          const issueDate = new Date();
          issueDate.setMonth(issueDate.getMonth() - 2); // Acreditado hace 2 meses
          const expiryDate = new Date(issueDate.getTime());
          expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Vence en 10 meses (VIGENTE)

          await prisma.employeeSvspCourse.create({
            data: {
              tenantId,
              employeeId: emp.id,
              svspLevelId: svspLevel1101.id,
              academyId: academy.id,
              nroCode: `NRO-2026-${emp.document}`,
              certificateNumber: `ACT-${emp.document.slice(-4)}`,
              issueDate,
              expiryDate,
              isCurrent: true,
            },
          });
        }
      }

      // 12.3 Hiring Requirement Checks
      for (const req of reqs) {
        const existingCheck = await prisma.employeeRequirementCheck.findUnique({
          where: {
            tenantId_employeeId_requirementId: {
              tenantId,
              employeeId: emp.id,
              requirementId: req.id,
            },
          },
        });

        if (!existingCheck) {
          await prisma.employeeRequirementCheck.create({
            data: {
              tenantId,
              employeeId: emp.id,
              requirementId: req.id,
              status: 'VERIFIED',
              verifiedAt: new Date(),
              notes: 'Verificado y cotejado en físico de ingreso',
            },
          });
        }
      }

      // 12.4 Internal Training
      const existingTraining = await prisma.employeeInternalTraining.findFirst({
        where: { tenantId, employeeId: emp.id },
      });
      if (!existingTraining) {
        await prisma.employeeInternalTraining.create({
          data: {
            tenantId,
            employeeId: emp.id,
            title: 'Inducción General y Protocolos de Seguridad SVSP',
            topic: 'Atención al Usuario y Control de Accesos',
            instructorName: 'Capitán (R) Carlos Mendoza',
            trainingDate: new Date(),
            durationHours: 4.0,
            score: 4.8,
            approved: true,
            notes: 'Aprobación satisfactoria con felicitaciones.',
          },
        });
      }
    }

    // 13. SPEC-ADM-030: Shift Sequences & Phase 3 Sample Data
    const sequences = [
      {
        code: '2X2X2',
        name: 'Secuencia 2 Diurnos, 2 Nocturnos, 2 Descansos (12H)',
        patternJson: ['D', 'D', 'N', 'N', 'X', 'X'],
        cycleDaysLength: 6,
        dayShiftHours: 12,
        nightShiftHours: 12,
      },
      {
        code: '4X2',
        name: 'Secuencia 4 Días Trabajo, 2 Descansos (12H)',
        patternJson: ['D', 'D', 'D', 'D', 'X', 'X'],
        cycleDaysLength: 6,
        dayShiftHours: 12,
        nightShiftHours: 12,
      },
      {
        code: '5X2',
        name: 'Secuencia 5 Días Lunes a Viernes, Sábado y Domingo Descanso',
        patternJson: ['D', 'D', 'D', 'D', 'D', 'X', 'X'],
        cycleDaysLength: 7,
        dayShiftHours: 8,
        nightShiftHours: 0,
      },
      {
        code: '6X1',
        name: 'Secuencia 6 Días Lunes a Sábado, Domingo Descanso',
        patternJson: ['D', 'D', 'D', 'D', 'D', 'D', 'X'],
        cycleDaysLength: 7,
        dayShiftHours: 8,
        nightShiftHours: 0,
      },
    ];

    for (const seq of sequences) {
      await prisma.payrollShiftSequence.upsert({
        where: { tenantId_code: { tenantId, code: seq.code } },
        update: { name: seq.name, patternJson: seq.patternJson },
        create: { ...seq, tenantId },
      });
    }

    // Sample Loan & Incapacity for first employee
    const firstEmp = employees[0];
    if (firstEmp && defaultDep) {
      // 13.1 Dependency Assignment
      const existingAssign = await prisma.employeeDependencyAssignment.findFirst({
        where: { tenantId, employeeId: firstEmp.id },
      });
      if (!existingAssign) {
        await prisma.employeeDependencyAssignment.create({
          data: {
            tenantId,
            employeeId: firstEmp.id,
            dependencyId: defaultDep.id,
            branchId: bogotaBranchId,
            assignmentRole: 'TITULAR',
            startDate: new Date('2026-01-01'),
            isPrimary: true,
            notes: 'Asignación titular desde inicio de año',
          },
        });
      }

      // 13.2 Sample Loan
      const loanConcept = await prisma.payrollConcept.findFirst({
        where: { tenantId, code: 510 },
      });
      if (loanConcept) {
        const existingLoan = await prisma.payrollLoan.findFirst({
          where: { tenantId, employeeId: firstEmp.id },
        });
        if (!existingLoan) {
          const newLoan = await prisma.payrollLoan.create({
            data: {
              tenantId,
              employeeId: firstEmp.id,
              conceptId: loanConcept.id,
              loanCode: `PR-2026-${firstEmp.document.slice(-4)}`,
              description: 'Préstamo Calamidad Doméstica y Salud',
              disbursementDate: new Date('2026-02-01'),
              startDeductionDate: new Date('2026-02-15'),
              principalAmount: 600000.0,
              installmentAmount: 100000.0,
              totalInstallments: 6,
              paidInstallments: 1,
              totalPaidAmount: 100000.0,
              remainingBalance: 500000.0,
              deductionRule: 'ALL_PERIODS',
              status: 'ACTIVE',
            },
          });

          await prisma.payrollLoanInstallment.create({
            data: {
              tenantId,
              loanId: newLoan.id,
              installmentNumber: 1,
              paymentDate: new Date('2026-02-28'),
              amount: 100000.0,
              balanceAfter: 500000.0,
              paymentMethod: 'PAYROLL_DEDUCTION',
              notes: 'Descuento aplicado en nómina de febrero',
            },
          });
        }
      }

      // 13.3 Sample Incapacity (CIE-10 J00)
      const cie10J00 = await prisma.payrollCie10.findFirst({
        where: { tenantId, code: 'J00' },
      });
      const egConcept = await prisma.payrollConcept.findFirst({
        where: { tenantId, code: 100 },
      });
      const existingLeave = await prisma.payrollLeaveAndAbsence.findFirst({
        where: { tenantId, employeeId: firstEmp.id },
      });
      if (!existingLeave && cie10J00 && egConcept) {
        const leaveStart = new Date('2026-03-10');
        const leaveEnd = new Date('2026-03-12'); // 3 días
        await prisma.payrollLeaveAndAbsence.create({
          data: {
            tenantId,
            employeeId: firstEmp.id,
            leaveType: 'SICK_LEAVE_EG',
            conceptId: egConcept.id,
            cie10Id: cie10J00.id,
            startDate: leaveStart,
            endDate: leaveEnd,
            totalDays: 3,
            employerDays: 2,
            entityDays: 1,
            baseSalaryMonthly: 1750905.0,
            ibcDailyValue: 58363.5,
            employerRecognizedAmount: 116727.0, // 2 días al 100% o 66.67% respetando piso
            entityRecognizedAmount: 38909.0, // 1 día EPS
            totalLiquidatedAmount: 155636.0,
            claimStatus: 'FILED_IN_AUDIT',
            certificateNumber: 'MED-2026-8812',
            filingDate: new Date('2026-03-15'),
            notes: 'Incapacidad médica por afección respiratoria radicada ante EPS Sanitas',
          },
        });
      }

      // 13.4 Sample Permanent Concept
      const bonConcept = await prisma.payrollConcept.findFirst({
        where: { tenantId, code: 1 }, // Sueldo básico o similar
      });
      if (bonConcept) {
        const existingPerm = await prisma.payrollPermanentConcept.findFirst({
          where: { tenantId, employeeId: firstEmp.id },
        });
        if (!existingPerm) {
          await prisma.payrollPermanentConcept.create({
            data: {
              tenantId,
              scope: 'BY_EMPLOYEE',
              employeeId: firstEmp.id,
              conceptId: bonConcept.id,
              amount: 150000.0,
              isProportionalToDays: false,
              applicationRule: 'ALL_PERIODS',
              isActive: true,
              notes: 'Auxilio voluntario no constitutivo de salario',
            },
          });
        }
      }

      // 14. SPEC-ADM-031: Payroll Settlement, Advances & Bank ACH Seeds
      // 14.1 Sample Salary History
      const existingHistory = await prisma.employeeSalaryHistory.findFirst({
        where: { tenantId, employeeId: firstEmp.id },
      });
      if (!existingHistory) {
        await prisma.employeeSalaryHistory.create({
          data: {
            tenantId,
            employeeId: firstEmp.id,
            salaryMode: 'MINIMUM_WAGE',
            previousSalary: 1600000.0,
            newSalary: 1750905.0,
            variationPct: 9.43,
            effectiveDate: new Date('2026-01-01'),
            origin: 'SMMLV_GLOBAL_UPDATE',
            reason: 'Ajuste anual estatutario SMMLV 2026',
          },
        });
      }

      // 14.2 Sample Fortnight Advance (Día 15)
      const octAdvance = await prisma.payrollAdvanceSettlement.upsert({
        where: {
          tenantId_year_month: {
            tenantId,
            year: 2026,
            month: 10,
          },
        },
        update: {},
        create: {
          tenantId,
          year: 2026,
          month: 10,
          cutoffDate: new Date('2026-10-15'),
          paymentDate: new Date('2026-10-15'),
          status: 'APPROVED',
          totalEmployees: 1,
          totalAmount: 700362.0,
          notes: 'Anticipo quincenal ordinario 40% del salario',
        },
      });

      await prisma.payrollAdvanceItem.upsert({
        where: {
          advanceSettlementId_employeeId: {
            advanceSettlementId: octAdvance.id,
            employeeId: firstEmp.id,
          },
        },
        update: {},
        create: {
          tenantId,
          advanceSettlementId: octAdvance.id,
          employeeId: firstEmp.id,
          baseSalary: 1750905.0,
          advancePctApplied: 0.40,
          workedDaysFirstFortnight: 15,
          absenceDaysDeducted: 0,
          calculatedAmount: 700362.0,
          approvedAmount: 700362.0,
          isManuallyEdited: false,
          isDeductedInPayroll: false,
          bankAccountType: 'SAVINGS',
          bankAccountNumber: '9876543210',
          hasBankWarning: false,
        },
      });

      // 14.3 Sample Payroll Period Settlement
      const octPeriod = await prisma.payrollPeriod.findFirst({
        where: { tenantId, year: 2026, month: 10 },
      });

      if (octPeriod) {
        const sampleSettlement = await prisma.payrollPeriodSettlement.upsert({
          where: {
            tenantId_periodId_employeeId: {
              tenantId,
              periodId: octPeriod.id,
              employeeId: firstEmp.id,
            },
          },
          update: {},
          create: {
            tenantId,
            periodId: octPeriod.id,
            employeeId: firstEmp.id,
            status: 'DRAFT',
            salaryModeSnapshot: 'MINIMUM_WAGE',
            baseSalaryMonthly: 1750905.0,
            workedDays: 30,
            paidLeaveDays: 0,
            incapacityDays: 0,
            vacationDays: 0,
            unpaidAbsenceDays: 0,
            seventhDaysLost: 0,
            basicSalaryEarned: 1750905.0,
            transportAllowanceAmount: 249095.0,
            overtimeAndSurchargesAmount: 185000.0,
            leavesAndIncapacitiesAmount: 0.0,
            bonusesNonSalarialAmount: 0.0,
            otherEarningsAmount: 0.0,
            totalEarnings: 2185000.0,
            ugppTotalRemuneration: 1935905.0,
            ugppLimit40Pct: 774362.0,
            ugppNonSalarialTotal: 0.0,
            ugppExcessAmount: 0.0,
            ibcEps: 1935905.0,
            ibcAfp: 1935905.0,
            ibcArl: 1935905.0,
            ibcCcf: 1935905.0,
            healthEmployeeAmount: 77436.0,
            pensionEmployeeAmount: 77436.0,
            fspAmount: 0.0,
            withholdingTaxAmount: 0.0,
            loansDeductionAmount: 0.0,
            advanceDeductionAmount: 700362.0,
            otherDeductionsAmount: 0.0,
            totalDeductions: 855234.0,
            netPayAmount: 1329766.0,
            isExoneratedLaw1607: true,
            employerHealthAmount: 0.0,
            employerPensionAmount: 232309.0,
            employerArlAmount: 47042.0,
            employerCcfAmount: 77436.0,
            employerSenaAmount: 0.0,
            employerIcbfAmount: 0.0,
            totalEmployerCost: 356787.0,
            bankAccountType: 'SAVINGS',
            bankAccountNumber: '9876543210',
            hasBankWarning: false,
            payslipEmailStatus: 'NOT_SENT',
            isManuallyEdited: false,
          },
        });

        // Lines for basic, transport, surcharge, health, pension, advance
        const basicConcept = await prisma.payrollConcept.findFirst({ where: { tenantId, code: 1 } });
        const transConcept = await prisma.payrollConcept.findFirst({ where: { tenantId, code: 10 } });
        const healthConcept = await prisma.payrollConcept.findFirst({ where: { tenantId, code: 601 } });
        const pensionConcept = await prisma.payrollConcept.findFirst({ where: { tenantId, code: 602 } });
        const advConcept = await prisma.payrollConcept.findFirst({ where: { tenantId, code: 509 } });

        const existingLines = await prisma.payrollSettlementLine.count({
          where: { tenantId, settlementId: sampleSettlement.id },
        });

        if (existingLines === 0 && basicConcept && transConcept) {
          await prisma.payrollSettlementLine.createMany({
            data: [
              {
                tenantId,
                settlementId: sampleSettlement.id,
                periodId: octPeriod.id,
                employeeId: firstEmp.id,
                conceptId: basicConcept.id,
                nature: 'DEVENGO',
                origin: 'DEPENDENCY_SPAN',
                quantity: 30,
                unitValue: 58363.5,
                totalValue: 1750905.0,
                isConstitutiveOfSalary: true,
                isDeletable: false,
                inIbcEpsAfp: true,
                inIbcArl: true,
                inIbcCcf: true,
              },
              {
                tenantId,
                settlementId: sampleSettlement.id,
                periodId: octPeriod.id,
                employeeId: firstEmp.id,
                conceptId: transConcept.id,
                nature: 'DEVENGO',
                origin: 'LEGAL_TRANSPORT',
                quantity: 30,
                unitValue: 8303.17,
                totalValue: 249095.0,
                isConstitutiveOfSalary: false,
                isDeletable: false,
              },
              ...(healthConcept
                ? [
                    {
                      tenantId,
                      settlementId: sampleSettlement.id,
                      periodId: octPeriod.id,
                      employeeId: firstEmp.id,
                      conceptId: healthConcept.id,
                      nature: 'SEG_SOCIAL' as any,
                      origin: 'LEGAL_HEALTH' as any,
                      quantity: 1,
                      unitValue: 77436.0,
                      totalValue: 77436.0,
                      isConstitutiveOfSalary: false,
                      isDeletable: false,
                    },
                  ]
                : []),
              ...(pensionConcept
                ? [
                    {
                      tenantId,
                      settlementId: sampleSettlement.id,
                      periodId: octPeriod.id,
                      employeeId: firstEmp.id,
                      conceptId: pensionConcept.id,
                      nature: 'SEG_SOCIAL' as any,
                      origin: 'LEGAL_PENSION' as any,
                      quantity: 1,
                      unitValue: 77436.0,
                      totalValue: 77436.0,
                      isConstitutiveOfSalary: false,
                      isDeletable: false,
                    },
                  ]
                : []),
              ...(advConcept
                ? [
                    {
                      tenantId,
                      settlementId: sampleSettlement.id,
                      periodId: octPeriod.id,
                      employeeId: firstEmp.id,
                      conceptId: advConcept.id,
                      nature: 'DEDUCCION' as any,
                      origin: 'FORTNIGHT_ADVANCE' as any,
                      quantity: 1,
                      unitValue: 700362.0,
                      totalValue: 700362.0,
                      isConstitutiveOfSalary: false,
                      isDeletable: true,
                    },
                  ]
                : []),
            ],
          });
        }
      }
    }

    // SPEC-ADM-032: Phase 5 Benefits & Vacation Seeds
    if (firstEmp) {
      // 1. Vacation Settlement Sample
      const existingVacation = await prisma.payrollVacationSettlement.findFirst({
        where: { tenantId, employeeId: firstEmp.id },
      });

      if (!existingVacation) {
        await prisma.payrollVacationSettlement.create({
          data: {
            tenantId,
            employeeId: firstEmp.id,
            vacationType: 'ENJOYED_IN_TIME',
            status: 'APPROVED',
            accrualStartDate: new Date('2025-01-01'),
            accrualEndDate: new Date('2025-12-31'),
            enjoymentStartDate: new Date('2026-06-01'),
            enjoymentEndDate: new Date('2026-06-18'),
            returnDate: new Date('2026-06-19'),
            businessDays: 15.0,
            nonWorkingDaysIncluded: 3,
            calendarDaysPaid: 18,
            saturdayWasWorkingDay: true,
            currentBasicSalary: 1500000.0,
            averageVariableVacBase: 120000.0,
            totalVacationBase: 1620000.0,
            dailyVacationRate: 54000.0,
            grossVacationAmount: 972000.0,
            healthDeductionAmount: 38880.0,
            pensionDeductionAmount: 38880.0,
            loansDeductionAmount: 0.0,
            netPayAmount: 894240.0,
            paymentDate: new Date('2026-05-30'),
            notes: 'Vacaciones ordinarias primer año causadas y disfrutadas.',
          },
        });
      }

      // 2. Social Benefit Batch Sample (Prima 1er Semestre 2026)
      const existingPrimaBatch = await prisma.payrollSocialBenefitBatch.findUnique({
        where: {
          tenantId_benefitType_year: {
            tenantId,
            benefitType: 'PRIMA_FIRST_SEMESTER',
            year: 2026,
          },
        },
      });

      if (!existingPrimaBatch) {
        const batch = await prisma.payrollSocialBenefitBatch.create({
          data: {
            tenantId,
            benefitType: 'PRIMA_FIRST_SEMESTER',
            year: 2026,
            label: 'Prima de Servicios 1er Semestre 2026',
            periodStartDate: new Date('2026-01-01'),
            cutoffDate: new Date('2026-05-31'),
            projectionEndDate: new Date('2026-06-30'),
            paymentDate: new Date('2026-06-15'),
            status: 'APPROVED',
            totalEmployees: 1,
            totalBenefitAmount: 850000.0,
            totalInterestAmount: 0.0,
            notes: 'Liquidación oficial semestral con corte al 31 de mayo.',
          },
        });

        await prisma.payrollSocialBenefitItem.create({
          data: {
            tenantId,
            batchId: batch.id,
            employeeId: firstEmp.id,
            hireDateSnapshot: new Date('2025-01-01'),
            grossDaysInPeriod: 180,
            unpaidLeaveDaysDeducted: 0,
            projectedDaysAdded: 30,
            netDaysWorked: 180,
            basicSalaryMonthly: 1500000.0,
            averageVariableEarnings: 0.0,
            transportAllowanceBase: 200000.0,
            totalComputationBase: 1700000.0,
            calculatedBenefitAmount: 850000.0,
            approvedBenefitAmount: 850000.0,
            interestRatePct: 0.0,
            calculatedInterestAmount: 0.0,
            approvedInterestAmount: 0.0,
            bankAccountType: 'SAVINGS',
            bankAccountNumber: '987654321',
            hasBankWarning: false,
          },
        });
      }
    }
  }

  console.log('✅ Payroll Foundations & Catalogs seeded successfully!');
}

