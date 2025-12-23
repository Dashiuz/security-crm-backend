import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: { generateDummyToken: jest.Mock };

  beforeEach(async () => {
    service = { generateDummyToken: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates to AuthService.generateDummyToken', async () => {
    service.generateDummyToken.mockResolvedValue('signed-token');

    await expect(controller.generateDummyToken()).resolves.toBe('signed-token');
    expect(service.generateDummyToken).toHaveBeenCalledTimes(1);
  });
});
