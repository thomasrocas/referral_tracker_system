declare module 'express' {
  export interface Request {
    body?: any;
    params: Record<string, string>;
    headers: Record<string, string | string[] | undefined>;
    user?: import('../auth/user.js').AppUser;
    header(name: string): string | undefined;
  }

  export interface Response {
    status(code: number): Response;
    json(body: any): Response;
    send(body?: any): Response;
  }

  export type NextFunction = (err?: any) => void;
  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => any;
  export type ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => any;

  export interface Router {
    use(...handlers: any[]): Router;
    get(path: string, ...handlers: RequestHandler[]): Router;
    post(path: string, ...handlers: RequestHandler[]): Router;
    patch(path: string, ...handlers: RequestHandler[]): Router;
  }

  export interface Application extends Router {
    listen(port: number, cb?: () => void): void;
  }

  export interface ExpressModule {
    (): Application;
    Router(): Router;
    json(options?: any): RequestHandler;
  }

  const express: ExpressModule;
  export default express;
}

declare module 'cors' {
  import type { RequestHandler } from 'express';
  export default function cors(options?: any): RequestHandler;
}

declare module 'pg' {
  export interface QueryResult<T = any> {
    rows: T[];
  }

  export class Pool {
    constructor(config?: any);
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    end(): Promise<void>;
  }
}

declare module 'pg-mem' {
  export interface PgFactory {
    Pool: {
      new (): any;
    };
  }

  export interface MemoryDb {
    public: {
      none(sql: string): void;
    };
    adapters: {
      createPg(): PgFactory;
    };
  }

  export function newDb(options?: any): MemoryDb;
}

declare module 'supertest' {
  const fn: any;
  export = fn;
}
