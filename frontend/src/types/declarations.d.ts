/** Type declarations for untyped third-party modules */

declare module 'file-saver' {
  export function saveAs(data: Blob | string, filename?: string, opts?: object): void;
}
