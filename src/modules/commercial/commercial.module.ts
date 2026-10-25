import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { SignaturesModule } from '../signatures/signatures.module';

// Repositories
import { CommercialSettingsRepository } from './repositories/commercial-settings.repository';
import { DocumentEngineRepository } from './repositories/document-engine.repository';
import { CommercialProposalsRepository } from './repositories/commercial-proposals.repository';
import { CommercialServiceOrdersRepository } from './repositories/commercial-service-orders.repository';
import { CommercialCrmRepository } from './repositories/commercial-crm.repository';
import { CommercialLegalRepository } from './repositories/commercial-legal.repository';

// Settings (Fase 1)
import { CommercialSettingsController } from './settings/controllers/commercial-settings.controller';
import { CommercialSettingsService } from './settings/services/commercial-settings.service';
import { TariffCalculationEngine } from './settings/services/tariff-calculation.service';
import { GuardSalaryCalculationEngine } from './settings/services/guard-salary-calculation.service';

// Document Engine (Fase 2)
import { DocumentEngineController } from './document-engine/controllers/document-engine.controller';
import { SignersController } from './document-engine/controllers/signers.controller';
import { ChameleonDocumentService } from './document-engine/services/chameleon-document.service';
import { AssetOptimizationService } from './document-engine/services/asset-optimization.service';
import { SnippetInterpolationService } from './document-engine/services/snippet-interpolation.service';

// Proposals & P&L (Tramo 1 - SPEC-ADM-020)
import { CommercialProposalsController } from './proposals/controllers/commercial-proposals.controller';
import { CommercialProposalsService } from './proposals/services/commercial-proposals.service';
import { PnlCalculatorService } from './proposals/services/pnl-calculator.service';

// Service Orders & Dispatch (Tramo 2 - SPEC-ADM-021)
import { CommercialServiceOrdersController } from './service-orders/controllers/commercial-service-orders.controller';
import { CommercialServiceOrdersService } from './service-orders/services/commercial-service-orders.service';

// CRM & Legal (Tramo 3 - SPEC-ADM-022)
import { CommercialCrmController } from './crm/controllers/commercial-crm.controller';
import { CommercialCrmService } from './crm/services/commercial-crm.service';
import { CommercialLegalController } from './legal/controllers/commercial-legal.controller';
import { CommercialLegalService } from './legal/services/commercial-legal.service';

@Module({
  imports: [PrismaModule, StorageModule, SignaturesModule],
  controllers: [
    CommercialSettingsController,
    DocumentEngineController,
    SignersController,
    CommercialProposalsController,
    CommercialServiceOrdersController,
    CommercialCrmController,
    CommercialLegalController,
  ],
  providers: [
    CommercialSettingsRepository,
    DocumentEngineRepository,
    CommercialProposalsRepository,
    CommercialServiceOrdersRepository,
    CommercialCrmRepository,
    CommercialLegalRepository,
    CommercialSettingsService,
    TariffCalculationEngine,
    GuardSalaryCalculationEngine,
    ChameleonDocumentService,
    AssetOptimizationService,
    SnippetInterpolationService,
    CommercialProposalsService,
    PnlCalculatorService,
    CommercialServiceOrdersService,
    CommercialCrmService,
    CommercialLegalService,
  ],
  exports: [
    CommercialSettingsRepository,
    DocumentEngineRepository,
    CommercialProposalsRepository,
    CommercialServiceOrdersRepository,
    CommercialCrmRepository,
    CommercialLegalRepository,
    CommercialSettingsService,
    TariffCalculationEngine,
    GuardSalaryCalculationEngine,
    ChameleonDocumentService,
    AssetOptimizationService,
    SnippetInterpolationService,
    CommercialProposalsService,
    PnlCalculatorService,
    CommercialServiceOrdersService,
    CommercialCrmService,
    CommercialLegalService,
  ],
})
export class CommercialModule {}
