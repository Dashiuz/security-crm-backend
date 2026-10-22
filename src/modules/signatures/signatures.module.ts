import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SignatureAuditService } from './services/signature-audit.service';
import { SignatureGeneratorService } from './services/signature-generator.service';
import { SignatureRequestService } from './services/signature-request.service';
import { UserSignatureController } from './controllers/user-signature.controller';
import { SignatureRequestController } from './controllers/signature-request.controller';
import { PublicSignatureController } from './controllers/public-signature.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    UserSignatureController,
    SignatureRequestController,
    PublicSignatureController,
  ],
  providers: [
    SignatureAuditService,
    SignatureGeneratorService,
    SignatureRequestService,
  ],
  exports: [
    SignatureAuditService,
    SignatureGeneratorService,
    SignatureRequestService,
  ],
})
export class SignaturesModule {}
