declare module 'docx-preview' {
  export interface RenderOptions {
    className?: string;
    inWrapper?: boolean;
    ignoreWidth?: boolean;
    ignoreHeight?: boolean;
    breakPages?: boolean;
    renderFootnotes?: boolean;
    renderEndnotes?: boolean;
    renderHeaders?: boolean;
    renderFooters?: boolean;
    useBase64URL?: boolean;
  }

  export function renderAsync(
    data: Blob | ArrayBuffer | Uint8Array,
    bodyContainer: HTMLElement,
    styleContainer?: HTMLElement,
    options?: RenderOptions,
  ): Promise<void>;
}
