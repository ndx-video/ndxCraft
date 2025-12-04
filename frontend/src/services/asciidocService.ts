import Asciidoctor from 'asciidoctor';

// Initialize Asciidoctor
// Note: In a real Wails/Vite build, ensure @asciidoctor/core is compatible with the bundler.
// For this demo, we assume the environment can handle the import or we might need a browser-specific build.
// We wrap it in a try-catch for robustness in diverse environments.

let asciidoctorInstance: any = null;

try {
  asciidoctorInstance = Asciidoctor();
} catch (e) {
  console.warn("Failed to initialize Asciidoctor. Ensure @asciidoctor/core is installed.", e);
}

export const convertToHtml = (adocContent: string): string => {
  if (!asciidoctorInstance) {
    return "<div class='text-red-500 p-4'>Error: Asciidoctor rendering engine not loaded.</div>";
  }
  try {
    // attributes: { showtitle: true } allows the Level 0 header to be rendered
    return asciidoctorInstance.convert(adocContent, { 
      safe: 'safe', 
      attributes: { showtitle: true, icons: 'font' } 
    }) as string;
  } catch (error) {
    console.error("AsciiDoc conversion error:", error);
    return `<div class='text-red-500 p-4'>Failed to render content: ${(error as Error).message}</div>`;
  }
};
