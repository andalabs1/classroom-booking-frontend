export type ApiResponse<T> = { success: boolean; data: T; message?: string };
export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
