export interface PaginationOptions {
  readonly page: number // 1-based
  readonly limit: number
}

export interface PaginatedResult<T> {
  readonly items: T[]
  readonly total: number
  readonly page: number
  readonly limit: number
  readonly totalPages: number
}

export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100
