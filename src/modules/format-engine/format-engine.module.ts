import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FormatEngineController } from './controllers/format-engine.controller';
import { FormatEngineService } from './services/format-engine.service';
import { DocumentParserService } from './services/document-parser.service';
import { SystemCatalogService } from './services/system-catalog.service';
import { FormatInterpolationService } from './services/format-interpolation.service';

@Module({
  imports: [PrismaModule],
  controllers: [FormatEngineController],
  providers: [
    FormatEngineService,
    DocumentParserService,
    SystemCatalogService,
    FormatInterpolationService,
  ],
  exports: [
    FormatEngineService,
    DocumentParserService,
    SystemCatalogService,
    FormatInterpolationService,
  ],
})
export class FormatEngineModule {}
