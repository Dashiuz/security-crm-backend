import { applyDecorators } from '@nestjs/common';
import { ApiQuery, ApiQueryOptions } from '@nestjs/swagger';

export const ApiQueryParams = (queries: ApiQueryOptions[]) =>
  applyDecorators(...queries.map((q) => ApiQuery(q)));
