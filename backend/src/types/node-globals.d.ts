declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  exit(code?: number): never;
};

declare class BufferClass extends Uint8Array {
  static from(data: string | ArrayBuffer, encoding?: string): BufferClass;
  toString(encoding?: string): string;
}

declare const Buffer: typeof BufferClass;

declare module 'path' {
  const path: any;
  export const resolve: (...args: any[]) => string;
  export const join: (...args: any[]) => string;
  export const dirname: (input: string) => string;
  export default path;
}

declare module 'fs' {
  export function readFileSync(path: string, options?: any): any;
}

declare module 'fs/promises' {
  export function readFile(path: string, options?: any): Promise<any>;
  export function readdir(path: string): Promise<string[]>;
}

declare module 'url' {
  export function fileURLToPath(path: string): string;
}

declare module 'crypto' {
  export function randomUUID(): string;
}
