/** Typecheck shim for `pg` when Next compiles ../api via externalDir (runtime uses web/node_modules/pg). */
declare module 'pg' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export interface QueryResult<R = any> {
    rows: R[];
    rowCount: number | null;
  }

  export interface PoolClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query<R = any>(sql: string, values?: unknown[]): Promise<QueryResult<R>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: { connectionString?: string });
    connect(): Promise<PoolClient>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query<R = any>(sql: string, values?: unknown[]): Promise<QueryResult<R>>;
    end(): Promise<void>;
  }
}
