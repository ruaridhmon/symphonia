declare module 'mammoth/mammoth.browser' {
  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: Record<string, unknown>,
  ): Promise<{
    value: string;
    messages: Array<{ type?: string; message?: string }>;
  }>;
}
