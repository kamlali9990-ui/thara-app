/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module 'qrcode' {
  interface QRCodeToCanvasOptions {
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }
  const qrcode: {
    toDataURL(text: string, options?: Record<string, unknown>): Promise<string>;
    toString(text: string, options?: Record<string, unknown>): Promise<string>;
    toCanvas(canvas: HTMLCanvasElement, text: string, options?: QRCodeToCanvasOptions, cb?: (error: Error | null) => void): void;
  };
  export default qrcode;
}
