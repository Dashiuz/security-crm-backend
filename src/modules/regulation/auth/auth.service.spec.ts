import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserRepositoryService } from '../../../common/repository/index';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: UserRepositoryService, useValue: { findActiveByDocument: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('clears refresh cookie', () => {
    const res = service.clearRefreshCookie();
    expect(res).toBeDefined();
    expect(res.name).toBe('refresh_token');
  });
});
