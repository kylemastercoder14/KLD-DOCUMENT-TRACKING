declare module "mammoth/mammoth.browser.js" {
  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: Record<string, unknown>
  ): Promise<{ value: string }>;
}

