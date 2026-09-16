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
      getResumeFilename(): Promise<string>;
      setResumeFilename(filename: string): Promise<string>;
      saveResume(
        bytes: ArrayBuffer | Uint8Array,
        filename?: string,
      ): Promise<string | null>;
    };
  }
}
