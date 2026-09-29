// Common utility types used across services

export interface ApiResponse<T = unknown> {
  data?:    T;
  error?:   string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items:  T[];
  count:  number;
  limit:  number;
  offset: number;
}

export interface PaginationQuery {
  limit?:  string;
  offset?: string;
}

export function paginate(query: PaginationQuery): { take: number; skip: number } {
  return {
    take: Math.min(parseInt(query.limit ?? '20'), 100),
    skip: parseInt(query.offset ?? '0'),
  };
}
