export interface PermissionDefinition {
  id: string;
  key: string;
  desc: string;
}

  export const CANONICAL_PERMISSIONS: PermissionDefinition[] = [
    {
      id: 'godlike_manage_perm_id',
      key: 'godlike:manage',
      desc: 'Control total y suplantación multitenant (SuperAdmin)',
    },
    {
      id: 'cifrv3kl0q2125x7y0mt1jqh',
      key: 'employee:create',
      desc: 'Crear registros de empleados',
    },
    {
      id: 'dzx5svkbiyyz3h3g2wvgcpux',
      key: 'employee:update',
      desc: 'Actualizar información de empleados',
    },
    {
      id: 'a4x3gqh1u7838sr0i3ppawv6',
      key: 'employee:delete',
      desc: 'Inhabilitar registros de empleados',
    },
    {
      id: 'cr81uhcznb2jf4fz1rgefcqs',
      key: 'employee:read',
      desc: 'Consultar información de empleados',
    },
    {
      id: 'zeckhi5qmd3mfya194f9eild',
      key: 'employee:manage',
      desc: 'Control total de empleados',
    },
    {
      id: 'rr21avrkpz662c4nt46oim02',
      key: 'user:read',
      desc: 'Consultar usuarios del sistema',
    },
    {
      id: 'ppla80fnzn2mz6jwt2qhbg7g',
      key: 'user:create',
      desc: 'Crear cuentas de usuario',
    },
    {
      id: 'ypaapa6zuq096eywf2gaa7ji',
      key: 'user:update',
      desc: 'Actualizar cuentas de usuario',
    },
    {
      id: 'qxtcbt1tko5en558ij61u8h0',
      key: 'user:delete',
      desc: 'Inhabilitar cuentas de usuario',
    },
    {
      id: 'zbtgfyii4fc39a05e9r614r5',
      key: 'user:passwordchange',
      desc: 'Cambiar propia contraseña',
    },
    {
      id: 'n6gt8r3kef5tn8nzm2qagvcy',
      key: 'user:manage',
      desc: 'Control total de usuarios',
    },
    {
      id: 'b8j7ryjce6x87mgei5qhfqqq',
      key: 'position:manage',
      desc: 'Control total de cargos',
    },
    {
      id: 'lb57f0sarsbx9vjx0bv8i03n',
      key: 'position:read',
      desc: 'Consultar cargos',
    },
    {
      id: 'a1i52a32lmw1t4ky4yz5axbx',
      key: 'position:create',
      desc: 'Crear cargos',
    },
    {
      id: 'igqvzkysose1r6ng8iqynuiq',
      key: 'position:update',
      desc: 'Actualizar cargos',
    },
    {
      id: 's0nrwq0c1uog3qhsv5kkks7o',
      key: 'position:delete',
      desc: 'Inhabilitar cargos',
    },
    {
      id: 'e72v2ptgx88hnynsrkdtguo2',
      key: 'permission:manage',
      desc: 'Control total de permisos',
    },
    {
      id: 'vgrfx394jfbnu89sabio1ti4',
      key: 'permission:read',
      desc: 'Consultar catálogo de permisos',
    },
    {
      id: 't47g1rc0mh0c3185ejs0sy7o',
      key: 'permission:update',
      desc: 'Actualizar permisos',
    },
    {
      id: 'tc292zvxyx1e5ih7lz345xkm',
      key: 'permission:create',
      desc: 'Crear permisos',
    },
    {
      id: 'zxwlroxej5yvcjknt4e2r79v',
      key: 'permission:delete',
      desc: 'Eliminar permisos',
    },
    {
      id: 'l8v8c3qkks6poncrqezicsxr',
      key: 'role:manage',
      desc: 'Control total de roles',
    },
    {
      id: 'b436kaotypnixngh2rcplzob',
      key: 'role:create',
      desc: 'Crear roles de acceso',
    },
    {
      id: 'alubdlmgjbk7wmfd1qoo2a1e',
      key: 'role:read',
      desc: 'Consultar roles de acceso',
    },
    {
      id: 'oq3399gojxeoo5fgbca7o3dq',
      key: 'role:update',
      desc: 'Actualizar roles y permisos',
    },
    {
      id: 'pugwssoo7gr24esozhgqaiit',
      key: 'role:delete',
      desc: 'Eliminar roles de acceso',
    },
    {
      id: 'ds881ym4qgzdsry0eqlcbhkg',
      key: 'department:manage',
      desc: 'Control total de departamentos',
    },
    {
      id: 'kb2193t9gfvt96tyvmmp36s0',
      key: 'department:create',
      desc: 'Crear departamentos',
    },
    {
      id: 'c1oc1yymdy8ft4in2owymc17',
      key: 'department:read',
      desc: 'Consultar departamentos',
    },
    {
      id: 'mvn7ffhwxdxctlh16sqyu2ld',
      key: 'department:delete',
      desc: 'Eliminar departamentos',
    },
    {
      id: 'm063o8qcuovvb09xuvqemcqf',
      key: 'department:update',
      desc: 'Actualizar departamentos',
    },
    // Minuta permissions
    {
      id: 'minuta_read_perm_id',
      key: 'minuta:read',
      desc: 'Consultar registros de minutas y bitácoras',
    },
    {
      id: 'minuta_create_perm_id',
      key: 'minuta:create',
      desc: 'Crear registros en minutas operativas',
    },
    {
      id: 'minuta_update_perm_id',
      key: 'minuta:update',
      desc: 'Actualizar o anular registros de minuta',
    },
    {
      id: 'minuta_delete_perm_id',
      key: 'minuta:delete',
      desc: 'Eliminar registros de minuta',
    },
    {
      id: 'minuta_manage_perm_id',
      key: 'minuta:manage',
      desc: 'Control total de operaciones de minuta',
    },
    {
      id: 'minuta_export_perm_id',
      key: 'minuta:export',
      desc: 'Exportar reportes y fichas de minuta en formato PDF',
    },
    // Client permissions
    {
      id: 'client_read_all_perm_id',
      key: 'client:read_all',
      desc: 'Consultar todas las cuentas de clientes del tenant',
    },
    {
      id: 'client_read_assigned_perm_id',
      key: 'client:read_assigned',
      desc: 'Consultar únicamente clientes asignados al usuario',
    },
    {
      id: 'client_read_workplace_perm_id',
      key: 'client:read_workplace',
      desc: 'Consultar cliente asociado al puesto de trabajo',
    },
    {
      id: 'client_create_perm_id',
      key: 'client:create',
      desc: 'Crear cuentas y sedes de clientes',
    },
    {
      id: 'client_update_perm_id',
      key: 'client:update',
      desc: 'Actualizar cuentas y sedes de clientes',
    },
    {
      id: 'client_delete_perm_id',
      key: 'client:delete',
      desc: 'Inhabilitar cuentas y sedes de clientes',
    },
    {
      id: 'client_manage_perm_id',
      key: 'client:manage',
      desc: 'Control total de operaciones de clientes',
    },
    {
      id: 'client_read_general_perm_id',
      key: 'client:read_general',
      desc: 'Consultar información general del cliente',
    },
    {
      id: 'client_update_general_perm_id',
      key: 'client:update_general',
      desc: 'Actualizar información general del cliente',
    },
    {
      id: 'client_read_operations_perm_id',
      key: 'client:read_operations',
      desc: 'Consultar estructura física y operativa del cliente',
    },
    {
      id: 'client_update_operations_perm_id',
      key: 'client:update_operations',
      desc: 'Actualizar estructura física y operativa del cliente',
    },
    {
      id: 'client_read_legal_perm_id',
      key: 'client:read_legal',
      desc: 'Consultar información contractual, legal y consejo',
    },
    {
      id: 'client_update_legal_perm_id',
      key: 'client:update_legal',
      desc: 'Actualizar información contractual, legal y consejo',
    },
    {
      id: 'client_read_residents_perm_id',
      key: 'client:read_residents',
      desc: 'Consultar directorio de residentes del cliente',
    },
    // Resident permissions
    {
      id: 'resident_read_perm_id',
      key: 'resident:read',
      desc: 'Consultar residentes y asignación de unidades',
    },
    {
      id: 'resident_create_perm_id',
      key: 'resident:create',
      desc: 'Crear residentes y vincular a unidades',
    },
    {
      id: 'resident_update_perm_id',
      key: 'resident:update',
      desc: 'Actualizar datos de residentes',
    },
    {
      id: 'resident_delete_perm_id',
      key: 'resident:delete',
      desc: 'Inhabilitar o desvincular residentes',
    },
    {
      id: 'resident_manage_perm_id',
      key: 'resident:manage',
      desc: 'Control total de residentes',
    },
    // Tenant permissions
    {
      id: 'tenant_read_perm_id',
      key: 'tenant:read',
      desc: 'Consultar perfil, configuración y límites del tenant',
    },
    {
      id: 'tenant_manage_perm_id',
      key: 'tenant:manage',
      desc: 'Control total del perfil y configuración del tenant',
    },
    // Security Study permissions
    {
      id: 'sec_study_read_perm_id',
      key: 'sec_study:read',
      desc: 'Consultar estudios y documentos de seguridad',
    },
    {
      id: 'sec_study_create_perm_id',
      key: 'sec_study:create',
      desc: 'Crear estudios de seguridad y cargar documentos',
    },
    {
      id: 'sec_study_update_perm_id',
      key: 'sec_study:update',
      desc: 'Actualizar estudios de seguridad y documentos',
    },
    {
      id: 'sec_study_delete_perm_id',
      key: 'sec_study:delete',
      desc: 'Eliminar o anular estudios de seguridad',
    },
    {
      id: 'sec_study_manage_perm_id',
      key: 'sec_study:manage',
      desc: 'Control total de estudios de seguridad',
    },
    // Canva permissions
    {
      id: 'canva_read_perm_id',
      key: 'canva:read',
      desc: 'Consultar mapas y diseños vectoriales de canvas',
    },
    {
      id: 'canva_create_perm_id',
      key: 'canva:create',
      desc: 'Crear mapas base e inicializar editor canvas',
    },
    {
      id: 'canva_update_perm_id',
      key: 'canva:update',
      desc: 'Actualizar trazos y dispositivos en el canvas',
    },
    {
      id: 'canva_delete_perm_id',
      key: 'canva:delete',
      desc: 'Eliminar o descartar diseños de canvas',
    },
    {
      id: 'canva_manage_perm_id',
      key: 'canva:manage',
      desc: 'Control total de canvas y aprobación de geocercas',
    },
    // PQRS permissions
    {
      id: 'pqrs_read_perm_id',
      key: 'pqrs:read',
      desc: 'Consultar radicados y mensajes PQRS',
    },
    {
      id: 'pqrs_create_perm_id',
      key: 'pqrs:create',
      desc: 'Radicar solicitudes PQRS y respuestas',
    },
    {
      id: 'pqrs_update_perm_id',
      key: 'pqrs:update',
      desc: 'Actualizar estado de PQRS y agregar mensajes',
    },
    {
      id: 'pqrs_delete_perm_id',
      key: 'pqrs:delete',
      desc: 'Eliminar tickets y mensajes PQRS',
    },
    {
      id: 'pqrs_assign_perm_id',
      key: 'pqrs:assign',
      desc: 'Asignar tickets PQRS a operadores/responsables',
    },
    {
      id: 'pqrs_manage_perm_id',
      key: 'pqrs:manage',
      desc: 'Control total administrativo de tickets PQRS',
    },
    // Digital Signatures (Noxia Sign - SPEC-CORE-009)
    {
      id: 'signatures_profile_manage_perm_id',
      key: 'signatures:profile:manage',
      desc: 'Gestionar firma digital personal en perfil y configuraciones',
    },
    {
      id: 'signatures_request_create_perm_id',
      key: 'signatures:request:create',
      desc: 'Emitir solicitudes de firma externa y generar magic links',
    },
    {
      id: 'signatures_request_read_perm_id',
      key: 'signatures:request:read',
      desc: 'Consultar estado, aperturas y evidencias de solicitudes de firma',
    },
    {
      id: 'signatures_request_revoke_perm_id',
      key: 'signatures:request:revoke',
      desc: 'Revocar y forzar expiración de solicitudes de firma pendientes',
    },
    {
      id: 'signatures_verify_public_perm_id',
      key: 'signatures:verify:public',
      desc: 'Verificación pública de autenticidad e integridad de documentos por QR',
    },
    // Commercial Domain & SVSP Tariff (SPEC-ADM-018)
    {
      id: 'commercial_settings_read_perm_id',
      key: 'commercial:settings:read',
      desc: 'Consultar parámetros comerciales, tarifas SVSP y catálogo de servicios',
    },
    {
      id: 'commercial_settings_manage_perm_id',
      key: 'commercial:settings:manage',
      desc: 'Administrar vigencias tarifarias, salarios, valores agregados y skins',
    },
    // Commercial Proposals & P&L (SPEC-ADM-020)
    {
      id: 'commercial_proposals_manage_perm_id',
      key: 'commercial:proposals:manage',
      desc: 'Control total de propuestas comerciales y cotizaciones',
    },
    {
      id: 'commercial_proposals_read_perm_id',
      key: 'commercial:proposals:read',
      desc: 'Consultar propuestas comerciales y cotizaciones',
    },
    {
      id: 'commercial_proposals_create_perm_id',
      key: 'commercial:proposals:create',
      desc: 'Crear cotizaciones y ofertas comerciales',
    },
    {
      id: 'commercial_proposals_update_perm_id',
      key: 'commercial:proposals:update',
      desc: 'Modificar líneas y borradores de propuestas',
    },
    {
      id: 'commercial_proposals_delete_perm_id',
      key: 'commercial:proposals:delete',
      desc: 'Eliminar borradores de propuestas comerciales',
    },
    {
      id: 'commercial_proposals_issue_perm_id',
      key: 'commercial:proposals:issue',
      desc: 'Emitir oficialmente propuestas congelando PDF en S3',
    },
    {
      id: 'commercial_proposals_approve_pnl_perm_id',
      key: 'commercial:proposals:approve_pnl',
      desc: 'Aprobar propuestas con margen P&L en alerta ámbar',
    },
    // Commercial Service Orders (SPEC-ADM-021)
    {
      id: 'commercial_orders_manage_perm_id',
      key: 'commercial:orders:manage',
      desc: 'Control total y reintentos de despacho de órdenes de servicio',
    },
    {
      id: 'commercial_orders_read_perm_id',
      key: 'commercial:orders:read',
      desc: 'Consultar órdenes de servicio e histórico',
    },
    {
      id: 'commercial_orders_create_perm_id',
      key: 'commercial:orders:create',
      desc: 'Crear órdenes de servicio, asignar código OMEGA y disparar despacho',
    },
    {
      id: 'commercial_orders_update_perm_id',
      key: 'commercial:orders:update',
      desc: 'Actualizar órdenes de servicio y su estado operativo',
    },
    {
      id: 'commercial_orders_dispatch_perm_id',
      key: 'commercial:orders:dispatch',
      desc: 'Despachar órdenes de servicio a departamentos internos',
    },
    {
      id: 'commercial_orders_delete_perm_id',
      key: 'commercial:orders:delete',
      desc: 'Eliminar órdenes de servicio en borrador',
    },
    // Commercial CRM & Legal (SPEC-ADM-022)
    {
      id: 'commercial_crm_manage_perm_id',
      key: 'commercial:crm:manage',
      desc: 'Control total de bitácora CRM y alertas de recaptación',
    },
    {
      id: 'commercial_crm_read_perm_id',
      key: 'commercial:crm:read',
      desc: 'Consultar prospectos, pipeline y bitácora de seguimiento',
    },
    {
      id: 'commercial_crm_create_perm_id',
      key: 'commercial:crm:create',
      desc: 'Crear registros de seguimiento en bitácora comercial',
    },
    {
      id: 'commercial_crm_update_perm_id',
      key: 'commercial:crm:update',
      desc: 'Actualizar registros de seguimiento en bitácora comercial',
    },
    {
      id: 'commercial_crm_delete_perm_id',
      key: 'commercial:crm:delete',
      desc: 'Eliminar registros de seguimiento en bitácora comercial',
    },
    {
      id: 'commercial_crm_followup_perm_id',
      key: 'commercial:crm:followup',
      desc: 'Registrar gestiones de contacto y cierres por pérdida',
    },
    {
      id: 'commercial_legal_manage_perm_id',
      key: 'commercial:legal:manage',
      desc: 'Gestionar pólizas, adiciones OSI y cumplimiento ANS',
    },
    {
      id: 'commercial_legal_read_perm_id',
      key: 'commercial:legal:read',
      desc: 'Consultar cartera legal 360, pólizas, otrosíes y compromisos ANS',
    },
    {
      id: 'commercial_legal_create_perm_id',
      key: 'commercial:legal:create',
      desc: 'Registrar pólizas contractuales, otrosíes y compromisos ANS',
    },
    {
      id: 'commercial_legal_update_perm_id',
      key: 'commercial:legal:update',
      desc: 'Actualizar pólizas contractuales, otrosíes y compromisos ANS',
    },
    {
      id: 'commercial_legal_delete_perm_id',
      key: 'commercial:legal:delete',
      desc: 'Eliminar pólizas contractuales, otrosíes y compromisos ANS',
    },
    // Universal Document Format Engine (SPEC-CORE-010 / SPEC-ADM-024)
    {
      id: 'format_read_perm_id',
      key: 'format:read',
      desc: 'Consultar plantillas y formatos universales',
    },
    {
      id: 'format_manage_perm_id',
      key: 'format:manage',
      desc: 'Diseñar, crear y actualizar formatos y variables transversales',
    },
    // Universal Code Generator & Identification Registry (SPEC-CORE-013)
    {
      id: 'tools_codes_read_perm_id',
      key: 'tools:codes:read',
      desc: 'Consultar registro de códigos QR y códigos de barra',
    },
    {
      id: 'tools_codes_create_perm_id',
      key: 'tools:codes:create',
      desc: 'Generar y registrar códigos QR y códigos de barra',
    },
    {
      id: 'tools_codes_manage_perm_id',
      key: 'tools:codes:manage',
      desc: 'Gestión total, edición y revocación de códigos de marcación y activos',
    },
    // Executive Dashboard (SPEC-CORE-013)
    {
      id: 'dashboard_read_perm_id',
      key: 'dashboard:read',
      desc: 'Consultar métricas KPI, gráficos y recordatorios del dashboard',
    },
    // Payroll Foundations & Dependencies (SPEC-ADM-028)
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
    // Payroll Employee Dossier & SVSP (SPEC-ADM-029)
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
    // Payroll Phase 3: Novelties, Incapacities, Loans & Shifts (SPEC-ADM-030)
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
    // Payroll Phase 4: Settlement Engine, Advances, ACH & Payslips (SPEC-ADM-031)
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
    // Payroll Phase 5: Social Benefits, Vacations & Final Liquidation (SPEC-ADM-032)
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
    // Payroll Phase 6: PILA, DIAN Electronic Payroll, Accounting & Reporting (SPEC-ADM-033)
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
