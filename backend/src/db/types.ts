export interface QueryResult<T> {
  rows: T[];
}

export interface DBClient {
  query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}
