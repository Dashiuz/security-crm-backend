import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;

  type SignParams = Parameters<JwtService['sign']>;
  type SignReturn = ReturnType<JwtService['sign']>;
  type JwtPayloadShape = {
    sub: string;
    jti: string;
    scope?: string[];
    iat?: number;
  };

  let jwtService: { sign: jest.Mock<SignReturn, SignParams> };
  let configService: { get: jest.Mock<unknown, [string]> };

  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  beforeEach(async () => {
    // Create typed mocks
    jwtService = { sign: jest.fn<SignReturn, SignParams>() };
    configService = { get: jest.fn<unknown, [string]>() };

    configService.get.mockImplementation((key: string) => {
      if (key === 'api.secret') return 'super-secret';
      if (key === 'api.expiresIn') return 3600; // 1 hour
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('signs and returns a token when secret is configured', async () => {
    jwtService.sign.mockReturnValue('signed-token');

    const token = await service.generateDummyToken();

    expect(token).toBe('signed-token');
    expect(jwtService.sign).toHaveBeenCalledTimes(1);

    const [payloadArg, optionsArg] = jwtService.sign.mock.calls[0];

    expect(
      typeof payloadArg === 'object' &&
        payloadArg !== null &&
        !Buffer.isBuffer(payloadArg),
    ).toBe(true);

    const payload = payloadArg as JwtPayloadShape;

    expect(payload.sub).toMatch(UUID_REGEX);
    expect(payload.jti).toMatch(UUID_REGEX);
    expect(payload.scope).toEqual(['reports:module']);
    expect(typeof payload.iat).toBe('number');
    expect(optionsArg).toMatchObject({ expiresIn: 3600 });
  });

  it('throws when JWT secret is not defined and does not call sign', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'api.secret') return '';
      if (key === 'api.expiresIn') return undefined;
      return undefined;
    });

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    const svc = module.get<AuthService>(AuthService);

    await expect(svc.generateDummyToken()).rejects.toThrow(
      'JWT secret is not defined',
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('defaults expiresIn=86400 when not configured', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'api.secret') return 'super-secret';
      if (key === 'api.expiresIn') return undefined;
      return undefined;
    });

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    const svc = module.get<AuthService>(AuthService);

    jwtService.sign.mockReturnValue('signed-token');

    await expect(svc.generateDummyToken()).resolves.toBe('signed-token');

    const [payloadArg2, optionsArg2] = jwtService.sign.mock.calls[0];

    expect(
      typeof payloadArg2 === 'object' &&
        payloadArg2 !== null &&
        !Buffer.isBuffer(payloadArg2),
    ).toBe(true);

    const payload2 = payloadArg2 as JwtPayloadShape;

    expect(payload2.sub).toMatch(UUID_REGEX);
    expect(payload2.jti).toMatch(UUID_REGEX);
    expect(optionsArg2).toMatchObject({ expiresIn: 86400 });
  });
});
