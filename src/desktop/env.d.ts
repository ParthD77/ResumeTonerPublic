export {};

declare global {
  interface Window {
    resumeDesktop?: {
      readonly platform: {
        readonly osLabel: string;
        readonly latexDistribution: string;
      };
      openChatGPT(): Promise<void>;
      openLatex(): Promise<string | null>;
      compileLatex(latex: string): Promise<{
        ok: boolean;
        pdf?: ArrayBuffer;
        error?: string;
        log: string;
      }>;
      saveLatex(latex: string): Promise<string | null>;
      saveResume(bytes: ArrayBuffer | Uint8Array): Promise<string | null>;
    };
  }
}
