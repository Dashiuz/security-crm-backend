import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureGuard } from './feature.guard';
import { RequestContextService } from '../../../common/context/request-context.service';

describe('FeatureGuard', () => {
  let guard: FeatureGuard;
  let reflector: Reflector;
  let contextService: RequestContextService;

  beforeEach(() => {
    reflector = new Reflector();
    contextService = new RequestContextService();
    guard = new FeatureGuard(reflector, contextService);
  });

  const createMockContext = (
    user?: any,
    handler = () => {},
    targetClass = class {},
  ): ExecutionContext => {
    return {
      getHandler: () => handler,
      getClass: () => targetClass,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no feature is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const mockCtx = createMockContext({ features: [] });
    expect(guard.canActivate(mockCtx)).toBe(true);
  });

  it('should allow access if empty feature array is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    const mockCtx = createMockContext({ features: [] });
    expect(guard.canActivate(mockCtx)).toBe(true);
  });

  it('should allow access if user is GODLIKE on system tenant', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('canva');

    const mockCtx = createMockContext({
      tenantId: 'system',
      roles: ['GODLIKE'],
      features: [],
    });
    expect(guard.canActivate(mockCtx)).toBe(true);
  });

  it('should allow access if contextService.isGodlike is true', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('canva');
    jest.spyOn(contextService, 'isGodlike', 'get').mockReturnValue(true);

    const mockCtx = createMockContext({
      tenantId: 'tenant-1',
      roles: ['USER'],
      features: [],
    });
    expect(guard.canActivate(mockCtx)).toBe(true);
  });

  it('should allow access if required single feature is enabled in user.features', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('canva');

    const mockCtx = createMockContext({
      tenantId: 'tenant-1',
      roles: ['USER'],
      features: ['canva', 'sec_study'],
    });
    expect(guard.canActivate(mockCtx)).toBe(true);
  });

  it('should throw ForbiddenException if required single feature is not in user.features', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('canva');

    const mockCtx = createMockContext({
      tenantId: 'tenant-1',
      roles: ['USER'],
      features: ['sec_study'],
    });

    expect(() => guard.canActivate(mockCtx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(mockCtx)).toThrow(
      "Feature 'canva' is not enabled for this tenant",
    );
  });

  it('should allow access if user has one of multiple required features', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['sec_study', 'canva']);

    const mockCtx = createMockContext({
      tenantId: 'tenant-1',
      roles: ['USER'],
      features: ['canva'],
    });

    expect(guard.canActivate(mockCtx)).toBe(true);
  });

  it('should throw ForbiddenException if user has none of the multiple required features', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['sec_study', 'canva']);

    const mockCtx = createMockContext({
      tenantId: 'tenant-1',
      roles: ['USER'],
      features: ['minuta'],
    });

    expect(() => guard.canActivate(mockCtx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(mockCtx)).toThrow(
      "Feature 'sec_study, canva' is not enabled for this tenant",
    );
  });

  it('should fallback to contextService.features if user.features is undefined', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('sec_study');
    jest.spyOn(contextService, 'features', 'get').mockReturnValue(['sec_study']);

    const mockCtx = createMockContext({
      tenantId: 'tenant-1',
      roles: ['USER'],
    });

    expect(guard.canActivate(mockCtx)).toBe(true);
  });
});
