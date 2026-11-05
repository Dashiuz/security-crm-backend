import { Test, TestingModule } from '@nestjs/testing';
import { PublicUniversalCodesController } from './public-universal-codes.controller';
import { UniversalCodesService } from '../services/universal-codes.service';

describe('PublicUniversalCodesController', () => {
  let controller: PublicUniversalCodesController;
  let service: jest.Mocked<UniversalCodesService>;

  beforeEach(async () => {
    const mockService = {
      resolveCode: jest.fn().mockResolvedValue({
        id: 'code-1',
        code: 'LORO-QR-1234',
        title: 'Punto Norte',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicUniversalCodesController],
      providers: [{ provide: UniversalCodesService, useValue: mockService }],
    }).compile();

    controller = module.get<PublicUniversalCodesController>(
      PublicUniversalCodesController,
    );
    service = module.get(UniversalCodesService);
  });

  it('debe resolver el código públicamente sin usuario autenticado', async () => {
    const result = await controller.verify('LORO-QR-1234');
    expect(result).toBeDefined();
    expect(service.resolveCode).toHaveBeenCalledWith('LORO-QR-1234', undefined);
  });
});
