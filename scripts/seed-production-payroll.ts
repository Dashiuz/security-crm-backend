/**
 * SCRIPT SEED PRODUCCIÓN - MÓDULO DE NÓMINA (SPEC-ADM-028..033)
 *
 * Ejecuta la inicialización no destructiva, idempotente y segura de:
 * 1. Feature transversal 'payroll'
 * 2. Permisos RBAC 'payroll:*' (17 permisos)
 * 3. Asignación automática a roles GODLIKE y ADMIN de todos los tenants existentes
 * 4. Catálogos maestros, configuración legal 2026 y periodos fiscales 2026 por tenant
 *
 * GARANTÍA DE SEGURIDAD:
 * - NO altera contraseñas ni datos de usuarios.
 * - NO crea datos mock sobre colaboradores reales.
 * - 100% Idempotente (upsert).
 */

import {
  PrismaClient,
  PayrollPaymentFrequency,
  PayrollAdvanceMode,
  PayrollConceptNature,
  PayrollProportionality,
  SocialSecurityEntityType,
  ShiftModalityClass,
} from '@prisma/client';

const prisma = new PrismaClient();

export function getColombianHolidays(
  year: number,
): Array<{ date: Date; name: string }> {
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
    const dayOfWeek = base.getUTCDay();
    if (dayOfWeek === 1) return base;
    const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    return addDays(base, daysToAdd);
  };

  const createDate = (y: number, m: number, d: number): Date => {
    return new Date(Date.UTC(y, m - 1, d));
  };

  return [
    { date: createDate(year, 1, 1), name: 'Año Nuevo' },
    { date: createDate(year, 5, 1), name: 'Día del Trabajo' },
    { date: createDate(year, 7, 20), name: 'Día de la Independencia' },
    { date: createDate(year, 8, 7), name: 'Batalla de Boyacá' },
    { date: createDate(year, 12, 8), name: 'Inmaculada Concepción' },
    { date: createDate(year, 12, 25), name: 'Navidad' },
    { date: addDays(easter, -3), name: 'Jueves Santo' },
    { date: addDays(easter, -2), name: 'Viernes Santo' },
    { date: toNextMonday(addDays(easter, 40)), name: 'Ascensión del Señor' },
    { date: toNextMonday(addDays(easter, 60)), name: 'Corpus Christi' },
    {
      date: toNextMonday(addDays(easter, 68)),
      name: 'Sagrado Corazón de Jesús',
    },
    { date: toNextMonday(createDate(year, 1, 6)), name: 'Reyes Magos' },
    { date: toNextMonday(createDate(year, 3, 19)), name: 'San José' },
    {
      date: toNextMonday(createDate(year, 6, 29)),
      name: 'San Pedro y San Pablo',
    },
    {
      date: toNextMonday(createDate(year, 8, 15)),
      name: 'Asunción de la Virgen',
    },
    { date: toNextMonday(createDate(year, 10, 12)), name: 'Día de la Raza' },
    { date: toNextMonday(createDate(year, 11, 1)), name: 'Todos los Santos' },
    {
      date: toNextMonday(createDate(year, 11, 11)),
      name: 'Independencia de Cartagena',
    },
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
}

async function main() {
  console.log('🚀 Iniciando despliegue de datos de nómina en Producción...');

  // ==========================================================================
  // 1. FEATURE 'payroll'
  // ==========================================================================
  console.log('\n[1/5] Actualizando Features del Sistema...');
  await prisma.feature.upsert({
    where: { key: 'payroll' },
    update: {
      name: 'Nómina y Liquidación Laboral',
      description:
        'Motor de nómina para vigilancia privada, dependencias operativas, turnos, PILA y Nómina Electrónica DIAN',
    },
    create: {
      key: 'payroll',
      name: 'Nómina y Liquidación Laboral',
      description:
        'Motor de nómina para vigilancia privada, dependencias operativas, turnos, PILA y Nómina Electrónica DIAN',
    },
  });
  console.log('  ✅ Feature "payroll" verificada.');

  // ==========================================================================
  // 2. PERMISOS RBAC DE NÓMINA (17 PERMISOS)
  // ==========================================================================
  console.log('\n[2/5] Actualizando Catálogo de Permisos RBAC de Nómina...');
  const payrollPermissions = [
    {
      id: 'payroll_settings_read_perm_id',
      key: 'payroll:settings:read',
      desc: 'Consultar parámetros legales, conceptos, cuentas PUC, festivos y catálogos de nómina',
    },
    {
      id: 'payroll_settings_manage_perm_id',
      key: 'payroll:settings:manage',
      desc: 'Crear y actualizar parámetros legales, conceptos, tablas base, cuentas PUC y catálogos oficiales',
    },
    {
      id: 'payroll_dependencies_read_perm_id',
      key: 'payroll:dependencies:read',
      desc: 'Consultar sucursales, centros de costo, dependencias (puestos), modalidades de turno y periodos',
    },
    {
      id: 'payroll_dependencies_manage_perm_id',
      key: 'payroll:dependencies:manage',
      desc: 'Crear, actualizar y sincronizar sucursales, dependencias operativas, modalidades de turno y periodos de nómina',
    },
    {
      id: 'payroll_employees_read_perm_id',
      key: 'payroll:employees:read',
      desc: 'Consultar expedientes laborales 360°, afiliaciones PILA, requisitos de ingreso, cursos SVSP y capacitaciones',
    },
    {
      id: 'payroll_employees_manage_perm_id',
      key: 'payroll:employees:manage',
      desc: 'Administrar expedientes laborales 360°, afiliaciones PILA, cuentas bancarias, grupo familiar, checklist de ingreso, cursos SVSP y Cap/SOMA',
    },
    {
      id: 'payroll_svsp_export_perm_id',
      key: 'payroll:svsp:export',
      desc: 'Generar y descargar la plantilla oficial en Excel de acreditaciones y cursos SVSP para RENOVA (SuperVigilancia)',
    },
    {
      id: 'payroll_novelties_read_perm_id',
      key: 'payroll:novelties:read',
      desc: 'Consultar incapacidades CIE-10, licencias, ausentismos, préstamos, conceptos fijos y novedades variables',
    },
    {
      id: 'payroll_novelties_manage_perm_id',
      key: 'payroll:novelties:manage',
      desc: 'Administrar incapacidades CIE-10, recobro EPS/ARL, préstamos, libranzas, cuotas, conceptos fijos y cargue masivo de novedades',
    },
    {
      id: 'payroll_shifts_read_perm_id',
      key: 'payroll:shifts:read',
      desc: 'Consultar rotación de puestos, secuencias operativas y malla de turnos 24/7',
    },
    {
      id: 'payroll_shifts_manage_perm_id',
      key: 'payroll:shifts:manage',
      desc: 'Administrar rotación de guardas por puesto, proyectar secuencias y editar celdas de turnos y refuerzos',
    },
    {
      id: 'payroll_settlement_read_perm_id',
      key: 'payroll:settlement:read',
      desc: 'Consultar liquidación de nómina (pre-nómina), desprendibles PDF, anticipos quincenales y lotes ACH',
    },
    {
      id: 'payroll_settlement_manage_perm_id',
      key: 'payroll:settlement:manage',
      desc: 'Ejecutar liquidación de nómina, edición manual de renglones, cálculo de anticipos día 15, cierre/reapertura de periodos, dispersión ACH y envío de desprendibles',
    },
    {
      id: 'payroll_benefits_read_perm_id',
      key: 'payroll:benefits:read',
      desc: 'Consultar Libro de Vacaciones, lotes de Prima, Cesantías e Intereses 12% y actas de liquidación definitiva de contrato',
    },
    {
      id: 'payroll_benefits_manage_perm_id',
      key: 'payroll:benefits:manage',
      desc: 'Otorgar y liquidar vacaciones con sincronización 3-en-1, generar lotes de prestaciones, inyectar a nómina y aprobar liquidaciones definitivas con paz y salvo',
    },
    {
      id: 'payroll_compliance_read_perm_id',
      key: 'payroll:compliance:read',
      desc: 'Consultar Planillas PILA Res. 2388, Nómina Electrónica DIAN, Interfaz Contable World Office/Helisa, Certificados 220 y Matriz BI',
    },
    {
      id: 'payroll_compliance_manage_perm_id',
      key: 'payroll:compliance:manage',
      desc: 'Liquidar Planilla PILA, transmitir Nómina Electrónica DIAN, generar Interfaz Contable, emitir Certificados 220 y Constancias Laborales',
    },
  ];

  const seededPermIds: string[] = [];
  for (const perm of payrollPermissions) {
    const record = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { desc: perm.desc },
      create: { id: perm.id, key: perm.key, desc: perm.desc },
    });
    seededPermIds.push(record.id);
  }
  console.log(
    `  ✅ ${payrollPermissions.length} permisos de nómina registrados/actualizados.`,
  );

  // ==========================================================================
  // 3. ASIGNACIÓN A ROLES GODLIKE Y ADMIN DE PRODUCCIÓN
  // ==========================================================================
  console.log('\n[3/5] Asignando Permisos a Roles GODLIKE y ADMIN...');
  const godlikeRoles = await prisma.role.findMany({
    where: { name: 'GODLIKE' },
  });
  const adminRoles = await prisma.role.findMany({
    where: { name: 'ADMIN' },
  });

  const rolesToEnrich = [...godlikeRoles, ...adminRoles];
  let assignedCount = 0;

  for (const role of rolesToEnrich) {
    for (const permId of seededPermIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permId,
          assignedAt: new Date(),
          assignedBy: 'system',
        },
      });
      assignedCount++;
    }
    console.log(
      `  🔹 Rol "${role.name}" (Tenant: ${role.tenantId}) enriquecido con permisos de nómina.`,
    );
  }
  console.log(
    `  ✅ Total asignaciones de permisos efectuadas: ${assignedCount}`,
  );

  // ==========================================================================
  // 4. TENANTS ACTIVOS EN PRODUCCIÓN
  // ==========================================================================
  console.log('\n[4/5] Identificando Tenants Activos...');
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true },
  });
  console.log(
    `  Encontrados ${tenants.length} tenants: ${tenants.map((t) => `${t.name} (${t.id})`).join(', ')}`,
  );

  // ==========================================================================
  // 5. CATÁLOGOS MAESTROS Y CONFIGURACIÓN LEGAL POR TENANT
  // ==========================================================================
  console.log('\n[5/5] Sembrando Catálogos Maestros y Periodos 2026...');

  for (const tenant of tenants) {
    const tenantId = tenant.id;
    console.log(`\n  --- Procesando Tenant: ${tenant.name} (${tenantId}) ---`);

    const tenantRecord = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { profile: true },
    });
    const companyLegalName =
      tenantId === 'system'
        ? 'NOXIA Master System S.A.S.'
        : tenantRecord?.profile?.legalName ||
          tenantRecord?.name ||
          'Seguridad Privada';
    const companyNit =
      tenantId === 'system'
        ? '900000000'
        : tenantRecord?.profile?.taxId?.split('-')[0] || '800123456';

    // 5.1 PayrollSettings (Legal 2026)
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

    // 5.2 Festivos Oficiales Colombia (2025, 2026, 2027)
    for (const year of [2025, 2026, 2027]) {
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

    // 5.3 Sucursales Principales
    const branches = [
      {
        code: 1,
        name: 'BOGOTA D.C.',
        daneCityCode: '11001',
        pilaBranchCode: '01',
      },
      {
        code: 2,
        name: 'MEDELLIN',
        daneCityCode: '05001',
        pilaBranchCode: '02',
      },
      { code: 3, name: 'CALI', daneCityCode: '76001', pilaBranchCode: '03' },
      {
        code: 4,
        name: 'BARRANQUILLA',
        daneCityCode: '08001',
        pilaBranchCode: '04',
      },
      {
        code: 5,
        name: 'BUCARAMANGA',
        daneCityCode: '68001',
        pilaBranchCode: '05',
      },
    ];
    for (const b of branches) {
      await prisma.payrollBranch.upsert({
        where: { tenantId_code: { tenantId, code: b.code } },
        update: { name: b.name },
        create: { ...b, tenantId },
      });
    }

    // 5.4 Bancos ACH
    const banks = [
      {
        code: '1007',
        name: 'BANCOLOMBIA',
        achCode: '007',
        exportFormat: 'PAB_BANCOLOMBIA',
      },
      {
        code: '1051',
        name: 'BANCO DAVIVIENDA',
        achCode: '051',
        exportFormat: 'DAVIVIENDA',
      },
      {
        code: '1032',
        name: 'BANCO CAJA SOCIAL (BCSC)',
        achCode: '032',
        exportFormat: 'BCSC',
      },
      {
        code: '1001',
        name: 'BANCO DE BOGOTA',
        achCode: '001',
        exportFormat: 'BOGOTA',
      },
      {
        code: '1023',
        name: 'BANCO DE OCCIDENTE',
        achCode: '023',
        exportFormat: 'OCCIDENTE',
      },
      {
        code: '1013',
        name: 'BBVA COLOMBIA',
        achCode: '013',
        exportFormat: 'BBVA',
      },
    ];
    for (const bk of banks) {
      await prisma.payrollBank.upsert({
        where: { tenantId_code: { tenantId, code: bk.code } },
        update: {
          name: bk.name,
          achCode: bk.achCode,
          exportFormat: bk.exportFormat,
        },
        create: { ...bk, tenantId },
      });
    }

    // 5.5 Entidades Seguridad Social (EPS, AFP, CCF, ARL)
    const entities = [
      {
        code: 'EPS010',
        name: 'EPS SURA',
        entityType: SocialSecurityEntityType.EPS,
        nit: '800088702',
        pluCode: 'EPS010',
        legacyConceptCode: 611,
      },
      {
        code: 'EPS005',
        name: 'SANITAS EPS',
        entityType: SocialSecurityEntityType.EPS,
        nit: '800251440',
        pluCode: 'EPS005',
        legacyConceptCode: 612,
      },
      {
        code: 'EPS037',
        name: 'NUEVA EPS',
        entityType: SocialSecurityEntityType.EPS,
        nit: '900156264',
        pluCode: 'EPS037',
        legacyConceptCode: 606,
      },
      {
        code: 'EPS008',
        name: 'COMPENSAR EPS',
        entityType: SocialSecurityEntityType.EPS,
        nit: '860066942',
        pluCode: 'EPS008',
        legacyConceptCode: 648,
      },
      {
        code: 'EPS002',
        name: 'SALUD TOTAL EPS',
        entityType: SocialSecurityEntityType.EPS,
        nit: '800130907',
        pluCode: 'EPS002',
        legacyConceptCode: 604,
      },
      {
        code: 'AFP001',
        name: 'PORVENIR AFP',
        entityType: SocialSecurityEntityType.AFP,
        nit: '800144897',
        pluCode: '230301',
        legacyConceptCode: 602,
      },
      {
        code: 'AFP002',
        name: 'PROTECCION AFP',
        entityType: SocialSecurityEntityType.AFP,
        nit: '800229739',
        pluCode: '230201',
        legacyConceptCode: 605,
      },
      {
        code: 'AFP003',
        name: 'COLPENSIONES',
        entityType: SocialSecurityEntityType.AFP,
        nit: '900336004',
        pluCode: '25-14',
        legacyConceptCode: 601,
      },
      {
        code: 'CCF09',
        name: 'COMPENSAR CCF',
        entityType: SocialSecurityEntityType.CCF,
        nit: '860066942',
        pluCode: 'CCF09',
      },
      {
        code: 'CCF21',
        name: 'COLSUBSIDIO CCF',
        entityType: SocialSecurityEntityType.CCF,
        nit: '860007336',
        pluCode: 'CCF21',
      },
      {
        code: 'CCF18',
        name: 'CAFAM CCF',
        entityType: SocialSecurityEntityType.CCF,
        nit: '860013570',
        pluCode: 'CCF18',
      },
      {
        code: 'ARL01',
        name: 'ARL SURA',
        entityType: SocialSecurityEntityType.ARL,
        nit: '890903407',
        pluCode: '14-28',
      },
      {
        code: 'ARL02',
        name: 'POSITIVA COMPAÑIA DE SEGUROS',
        entityType: SocialSecurityEntityType.ARL,
        nit: '860011153',
        pluCode: '14-23',
      },
    ];
    for (const ent of entities) {
      await prisma.payrollEntity.upsert({
        where: { tenantId_code: { tenantId, code: ent.code } },
        update: {
          name: ent.name,
          nit: ent.nit,
          pluCode: ent.pluCode,
          legacyConceptCode: ent.legacyConceptCode,
        },
        create: { ...ent, tenantId },
      });
    }

    // 5.6 Motivos de Retiro CST
    const exitReasons = [
      { code: 1, name: 'Renuncia Voluntaria', isJustCause: false },
      {
        code: 2,
        name: 'Terminación por Justa Causa (Falta Grave / Disciplinaria)',
        isJustCause: true,
      },
      {
        code: 3,
        name: 'Terminación sin Justa Causa (Indemnización Art. 64 CST)',
        isJustCause: false,
      },
      {
        code: 4,
        name: 'Vencimiento del Término Pactado / Fin de Obra',
        isJustCause: false,
      },
      { code: 5, name: 'Muerte del Trabajador', isJustCause: false },
      {
        code: 6,
        name: 'Mutuo Acuerdo / Conciliación Laboral',
        isJustCause: false,
      },
      {
        code: 7,
        name: 'Liquidación o Clausura Definitiva de la Empresa',
        isJustCause: false,
      },
      {
        code: 8,
        name: 'Suspensión de Actividades por más de 120 días',
        isJustCause: false,
      },
      {
        code: 9,
        name: 'Jubilación o Pensión de Vejez / Invalidez',
        isJustCause: false,
      },
    ];
    for (const ex of exitReasons) {
      await prisma.payrollExitReason.upsert({
        where: { tenantId_code: { tenantId, code: ex.code } },
        update: { name: ex.name, isJustCause: ex.isJustCause },
        create: { ...ex, tenantId },
      });
    }

    // 5.7 Requisitos de Ingreso
    const requirements = [
      {
        code: 1,
        name: 'Cédula de Ciudadanía',
        isMandatory: true,
        hasExpiry: false,
      },
      {
        code: 2,
        name: 'Libreta Militar / Certificado Situación Militar',
        isMandatory: true,
        hasExpiry: false,
      },
      {
        code: 3,
        name: 'Examen Médico de Ingreso Ocupacional',
        isMandatory: true,
        hasExpiry: true,
      },
      {
        code: 4,
        name: 'Examen Médico Psicofísico de Porte y Tenencia de Armas',
        isMandatory: true,
        hasExpiry: true,
      },
      {
        code: 5,
        name: 'Certificado Curso de Capacitación SVSP Vigente',
        isMandatory: true,
        hasExpiry: true,
      },
      {
        code: 6,
        name: 'Certificados de Antecedentes (Policía, Procuraduría, Contraloría)',
        isMandatory: true,
        hasExpiry: false,
      },
      {
        code: 7,
        name: 'Certificado de Afiliación EPS y Fondo de Pensiones',
        isMandatory: true,
        hasExpiry: false,
      },
      {
        code: 8,
        name: 'Certificación Bancaria para Pago de Nómina',
        isMandatory: true,
        hasExpiry: false,
      },
    ];
    for (const req of requirements) {
      await prisma.payrollHiringRequirement.upsert({
        where: { tenantId_code: { tenantId, code: req.code } },
        update: {
          name: req.name,
          isMandatory: req.isMandatory,
          hasExpiry: req.hasExpiry,
        },
        create: { ...req, tenantId },
      });
    }

    // 5.8 Códigos CIE-10 Frecuentes
    const cie10Codes = [
      {
        code: 'M545',
        familyCode: 'M00-M99',
        name: 'Lumbago no especificado / Dolor lumbar',
      },
      {
        code: 'J00',
        familyCode: 'J00-J99',
        name: 'Rinofaringitis aguda (resfriado común)',
      },
      {
        code: 'J029',
        familyCode: 'J00-J99',
        name: 'Faringitis aguda, no especificada',
      },
      {
        code: 'K529',
        familyCode: 'K00-K93',
        name: 'Gastroenteritis y colitis no infecciosas',
      },
      {
        code: 'S934',
        familyCode: 'S00-T88',
        name: 'Esguince y desgarro del tobillo',
      },
      {
        code: 'B349',
        familyCode: 'A00-B99',
        name: 'Infección viral, no especificada',
      },
      {
        code: 'R51X',
        familyCode: 'R00-R99',
        name: 'Cefalea y dolor de cabeza intenso',
      },
      { code: 'Z000', familyCode: 'Z00-Z99', name: 'Examen médico general' },
      {
        code: 'U071',
        familyCode: 'U00-U49',
        name: 'COVID-19, virus identificado',
      },
    ];
    for (const cie of cie10Codes) {
      await prisma.payrollCie10.upsert({
        where: { tenantId_code: { tenantId, code: cie.code } },
        update: { name: cie.name, familyCode: cie.familyCode, isActive: true },
        create: { ...cie, tenantId, isActive: true },
      });
    }

    // 5.9 Niveles de Capacitación SVSP
    const svspLevels = [
      { code: '1101', name: 'FUNDAMENTACION VIGILANCIA', validityDays: 365 },
      { code: '1102', name: 'REENTRENAMIENTO VIGILANCIA', validityDays: 365 },
      {
        code: '1103',
        name: 'ESPECIALIZACION VIGILANCIA (SECTORIAL)',
        validityDays: 365,
      },
      { code: '1201', name: 'FUNDAMENTACION ESCOLTA', validityDays: 365 },
      { code: '1202', name: 'REENTRENAMIENTO ESCOLTA', validityDays: 365 },
      {
        code: '1301',
        name: 'FUNDAMENTACION MANEJADOR CANINO',
        validityDays: 365,
      },
      {
        code: '1302',
        name: 'REENTRENAMIENTO MANEJADOR CANINO',
        validityDays: 365,
      },
      {
        code: '1308',
        name: 'FUNDAMENTACION MEDIOS TECNOLOGICOS (CCTV)',
        validityDays: 365,
      },
      {
        code: '1309',
        name: 'REENTRENAMIENTO MEDIOS TECNOLOGICOS',
        validityDays: 365,
      },
    ];
    for (const lvl of svspLevels) {
      await prisma.payrollSvspLevel.upsert({
        where: { tenantId_code: { tenantId, code: lvl.code } },
        update: { name: lvl.name, validityDays: lvl.validityDays },
        create: { ...lvl, tenantId },
      });
    }

    // 5.10 Academias de Seguridad Privada
    const academies = [
      {
        code: 1,
        name: 'ACADEMIA NACIONAL DE SEGURIDAD PRIVADA (ASONAL)',
        nit: '860012345-1',
        city: 'BOGOTA D.C.',
      },
      {
        code: 2,
        name: 'ACADEMIA COLOMBO LATINA DE SEGURIDAD',
        nit: '800054321-2',
        city: 'BOGOTA D.C.',
      },
      {
        code: 3,
        name: 'ESCUELA DE SEGURIDAD PRIVADA DEL ORIENTE',
        nit: '890123456-3',
        city: 'MEDELLIN',
      },
      {
        code: 4,
        name: 'CENTRO DE CAPACITACION EN SEGURIDAD PRIVADA ELITE',
        nit: '900112233-4',
        city: 'CALI',
      },
    ];
    for (const acad of academies) {
      await prisma.payrollSecurityAcademy.upsert({
        where: { tenantId_code: { tenantId, code: acad.code } },
        update: { name: acad.name, nit: acad.nit, city: acad.city },
        create: { ...acad, tenantId, isActive: true },
      });
    }

    // 5.11 Conceptos de Nómina Oficiales (Pronos)
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
        name: 'EXTRA DIURNA FESTIVA (205%)',
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
        code: 9,
        name: 'EXTRA NOCTURNA FESTIVA (255%)',
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
        code: 10,
        name: 'AUXILIO DE TRANSPORTE LEGAL',
        nature: PayrollConceptNature.DEVENGO,
        proportionality: PayrollProportionality.DAYS,
        isConstitutiveOfSalary: false,
        adminPucAccount: '510527',
        operativePucAccount: '720527',
        dianNieCode: 'NIE074',
        dianNieFieldName: 'AuxilioTransporte',
        inLiq: true,
        inPri: true,
        inTis: true,
        inCes: true,
      },
      {
        code: 100,
        name: 'INCAPACIDAD ENFERMEDAD GENERAL (66.67%)',
        nature: PayrollConceptNature.INCAPACIDAD,
        proportionality: PayrollProportionality.DAYS,
        defaultRatePct: 66.67,
        isConstitutiveOfSalary: false,
        adminPucAccount: '510518',
        operativePucAccount: '720518',
        dianNieCode: 'NIE112',
        inLiq: true,
        inIbcEpsAfp: true,
      },
      {
        code: 101,
        name: 'INCAPACIDAD ACCIDENTE DE TRABAJO (100%)',
        nature: PayrollConceptNature.INCAPACIDAD,
        proportionality: PayrollProportionality.DAYS,
        defaultRatePct: 100.0,
        isConstitutiveOfSalary: false,
        adminPucAccount: '510518',
        operativePucAccount: '720518',
        dianNieCode: 'NIE113',
        inLiq: true,
        inIbcEpsAfp: true,
      },
      {
        code: 102,
        name: 'LICENCIA DE MATERNIDAD / PATERNIDAD',
        nature: PayrollConceptNature.LICENCIA,
        proportionality: PayrollProportionality.DAYS,
        defaultRatePct: 100.0,
        isConstitutiveOfSalary: false,
        adminPucAccount: '510518',
        operativePucAccount: '720518',
        dianNieCode: 'NIE115',
        inLiq: true,
        inPri: true,
        inTis: true,
        inCes: true,
        inIbcEpsAfp: true,
      },
      {
        code: 104,
        name: 'VACACIONES DISFRUTADAS',
        nature: PayrollConceptNature.LICENCIA,
        proportionality: PayrollProportionality.DAYS,
        defaultRatePct: 100.0,
        isConstitutiveOfSalary: false,
        adminPucAccount: '510539',
        operativePucAccount: '720539',
        dianNieCode: 'NIE081',
        inLiq: true,
        inIbcEpsAfp: true,
        inIbcCcf: true,
      },
      {
        code: 509,
        name: 'DESCUENTO ANTICIPO QUINCENAL (DIA 15)',
        nature: PayrollConceptNature.DEDUCCION,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        isConstitutiveOfSalary: false,
        adminPucAccount: '136505',
        operativePucAccount: '136505',
        dianNieCode: 'NIE135',
        inLiq: true,
      },
      {
        code: 510,
        name: 'PRESTAMOS Y LIBRANZAS EMPRESA',
        nature: PayrollConceptNature.DEDUCCION,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        isConstitutiveOfSalary: false,
        adminPucAccount: '136515',
        operativePucAccount: '136515',
        dianNieCode: 'NIE136',
        inLiq: true,
      },
      {
        code: 601,
        name: 'APORTE SALUD EMPLEADO (4%)',
        nature: PayrollConceptNature.SEG_SOCIAL,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        defaultRatePct: 4.0,
        isConstitutiveOfSalary: false,
        adminPucAccount: '237005',
        operativePucAccount: '237005',
        dianNieCode: 'NIE127',
        inLiq: true,
      },
      {
        code: 602,
        name: 'APORTE PENSION EMPLEADO (4%)',
        nature: PayrollConceptNature.SEG_SOCIAL,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        defaultRatePct: 4.0,
        isConstitutiveOfSalary: false,
        adminPucAccount: '238030',
        operativePucAccount: '238030',
        dianNieCode: 'NIE128',
        inLiq: true,
      },
      {
        code: 603,
        name: 'FONDO DE SOLIDARIDAD PENSIONAL (FSP 1%)',
        nature: PayrollConceptNature.SEG_SOCIAL,
        proportionality: PayrollProportionality.NON_PROPORTIONAL,
        defaultRatePct: 1.0,
        isConstitutiveOfSalary: false,
        adminPucAccount: '238030',
        operativePucAccount: '238030',
        dianNieCode: 'NIE129',
        inLiq: true,
      },
    ];

    for (const c of concepts) {
      await prisma.payrollConcept.upsert({
        where: { tenantId_code: { tenantId, code: c.code } },
        update: {
          name: c.name,
          adminPucAccount: c.adminPucAccount,
          operativePucAccount: c.operativePucAccount,
          dianNieCode: c.dianNieCode,
        },
        create: { ...c, tenantId },
      });
    }

    // 5.12 Modalidades de Turno Oficiales Vigilancia Privada
    const modalities = [
      {
        code: 1,
        name: 'TURNO 24 HORAS ROTATIVO (2X2X2)',
        shiftClass: ShiftModalityClass.ROTATING,
        hoursPerShift: 12,
        description:
          'Malla operativa 24h con desglose garantizado según Pronos',
        items: [
          { conceptCode: 2, percentage: 35.9, sortOrder: 1 },
          { conceptCode: 4, percentage: 29.14, sortOrder: 2 },
          { conceptCode: 5, percentage: 10.98, sortOrder: 3 },
          { conceptCode: 8, percentage: 13.98, sortOrder: 4 },
          { conceptCode: 6, percentage: 10.0, sortOrder: 5 },
        ],
      },
      {
        code: 2,
        name: 'TURNO 12 HORAS DIURNO (L-S)',
        shiftClass: ShiftModalityClass.DAY_SHIFT,
        hoursPerShift: 12,
        description: 'Turno diurno 12h',
        items: [
          { conceptCode: 3, percentage: 70.0, sortOrder: 1 },
          { conceptCode: 5, percentage: 30.0, sortOrder: 2 },
        ],
      },
    ];

    for (const mod of modalities) {
      const modalityRecord = await prisma.payrollShiftModality.upsert({
        where: { tenantId_code: { tenantId, code: mod.code } },
        update: {
          name: mod.name,
          shiftClass: mod.shiftClass,
          hoursPerShift: mod.hoursPerShift,
          description: mod.description,
        },
        create: {
          tenantId,
          code: mod.code,
          name: mod.name,
          shiftClass: mod.shiftClass,
          hoursPerShift: mod.hoursPerShift,
          description: mod.description,
        },
      });

      for (const it of mod.items) {
        const concept = await prisma.payrollConcept.findFirst({
          where: { tenantId, code: it.conceptCode },
        });
        if (concept) {
          await prisma.payrollModalityItem.upsert({
            where: {
              modalityId_conceptId: {
                modalityId: modalityRecord.id,
                conceptId: concept.id,
              },
            },
            update: { percentage: it.percentage, sortOrder: it.sortOrder },
            create: {
              tenantId,
              modalityId: modalityRecord.id,
              conceptId: concept.id,
              percentage: it.percentage,
              sortOrder: it.sortOrder,
            },
          });
        }
      }
    }

    // 5.13 12 Periodos de Nómina Año Fiscal 2026 (2601 - 2612)
    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    for (let m = 1; m <= 12; m++) {
      const periodCode = 2600 + m;
      const lastDay = new Date(Date.UTC(2026, m, 0)).getUTCDate();
      const startIso = `2026-${String(m).padStart(2, '0')}-01T00:00:00.000Z`;
      const endIso = `2026-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T00:00:00.000Z`;
      const payIso = `2026-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T00:00:00.000Z`;

      await prisma.payrollPeriod.upsert({
        where: { tenantId_code: { tenantId, code: periodCode } },
        update: {
          label: `Nómina Mensual ${monthNames[m - 1]} 2026`,
        },
        create: {
          tenantId,
          code: periodCode,
          label: `Nómina Mensual ${monthNames[m - 1]} 2026`,
          year: 2026,
          month: m,
          periodNumber: 1,
          startDate: new Date(startIso),
          endDate: new Date(endIso),
          paymentDate: new Date(payIso),
          status: m <= 10 ? 'CLOSED' : 'OPEN',
          notes: `Periodo oficial año fiscal 2026 (${monthNames[m - 1]})`,
        },
      });
    }

    console.log(`  ✅ Tenant ${tenant.name} configurado exitosamente.`);
  }

  console.log(
    '\n🎉 ¡Despliegue de datos de nómina en Producción finalizado con éxito!',
  );
}

main()
  .catch((e) => {
    console.error('❌ Error durante el despliegue en Producción:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
