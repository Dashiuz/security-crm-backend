import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { SignaturesModule } from '../signatures/signatures.module';

// Repositories
import { CommercialSettingsRepository } from './repositories/commercial-settings.repository';
import { DocumentEngineRepository } from './repositories/document-engine.repository';

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

@Module({
  imports: [PrismaModule, StorageModule, SignaturesModule],
  controllers: [
    CommercialSettingsController,
    DocumentEngineController,
    SignersController,
  ],
  providers: [
    CommercialSettingsRepository,
    DocumentEngineRepository,
    CommercialSettingsService,
    TariffCalculationEngine,
    GuardSalaryCalculationEngine,
    ChameleonDocumentService,
    AssetOptimizationService,
    SnippetInterpolationService,
  ],
  exports: [
    CommercialSettingsRepository,
    DocumentEngineRepository,
    CommercialSettingsService,
    TariffCalculationEngine,
    GuardSalaryCalculationEngine,
    ChameleonDocumentService,
    AssetOptimizationService,
    SnippetInterpolationService,
  ],
})
export class CommercialModule {}
