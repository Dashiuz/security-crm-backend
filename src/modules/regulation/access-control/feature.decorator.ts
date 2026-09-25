import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'feature';
export const RequireFeature = (...features: string[]) =>
  SetMetadata(FEATURE_KEY, features);

