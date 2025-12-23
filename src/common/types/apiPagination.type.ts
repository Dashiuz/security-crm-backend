export type PaginatedResult<T> = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  items: T[];
};
