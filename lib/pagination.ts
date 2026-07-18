export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE: PageSize = 25;
export const MAX_PAGE_SIZE = 100;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export function parsePageLimit(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number } = {}
): { page: number; limit: number; skip: number } {
  const rawPage = Number(searchParams.get("page") ?? defaults.page ?? DEFAULT_PAGE);
  const rawLimit = Number(
    searchParams.get("limit") ?? defaults.limit ?? DEFAULT_PAGE_SIZE
  );

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : DEFAULT_PAGE;
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.floor(rawLimit)
        : DEFAULT_PAGE_SIZE
    )
  );

  return { page, limit, skip: (page - 1) * limit };
}

export function paginatedEnvelope<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return { items, total, page, limit };
}
