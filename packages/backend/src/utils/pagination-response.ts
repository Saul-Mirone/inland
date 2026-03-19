import type { PaginatedResult } from '../repositories/pagination';

export const toPaginatedResponse = <T>(
  key: string,
  result: PaginatedResult<T>
) => ({
  [key]: result.items,
  pagination: {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  },
});
