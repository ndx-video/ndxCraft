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

// Register Extension for Source Mapping
try {
  if (asciidoctorInstance) {
    asciidoctorInstance.Extensions.register(function (this: any) {
      this.treeProcessor(function (this: any) {
        this.process(function (doc: any) {
          // Find all blocks with a source line number
          const blocks = doc.findBy((b: any) => b.getLineNumber() !== undefined);
          blocks.forEach((block: any) => {
            // Add a class 'data-line-X' to the block.
            // This is the most reliable way to tag elements in the default HTML converter.
            block.addRole(`data-line-${block.getLineNumber()}`);
          });
          return doc;
        });
      });
    });
  }
} catch (e) {
  console.warn("Failed to register Asciidoctor extensions", e);
}

export const convertToHtml = (adocContent: string): string => {
  if (!asciidoctorInstance) {
    return "<div class='text-red-500 p-4'>Error: Asciidoctor rendering engine not loaded.</div>";
  }
  try {
    // attributes: { showtitle: true } allows the Level 0 header to be rendered
    return asciidoctorInstance.convert(adocContent, {
      safe: 'safe',
      sourcemap: true, // Enable sourcemap calculation (essential for getLineNumber)
      attributes: { showtitle: true, icons: 'font' }
    }) as string;
  } catch (error) {
    console.error("AsciiDoc conversion error:", error);
    return `<div class='text-red-500 p-4'>Failed to render content: ${(error as Error).message}</div>`;
  }
};

export interface AstNode {
  id: string;
  title: string;
  level: number;
  children: AstNode[];
  context: string;
  line?: number;
}

export const parseAST = (adocContent: string): AstNode[] => {
  if (!asciidoctorInstance) return [];

  try {
    const doc = asciidoctorInstance.load(adocContent, {
      safe: 'safe',
      sourcemap: true
    });

    const mapSection = (section: any): AstNode => {
      const title = section.getTitle ? section.getTitle() : '';
      const level = section.getLevel ? section.getLevel() : 0;
      const id = section.getId ? section.getId() : '';
      const lineno = section.getLineNumber ? section.getLineNumber() : undefined;

      const children: AstNode[] = [];
      if (section.getSections && section.getSections().length > 0) {
        section.getSections().forEach((sub: any) => {
          children.push(mapSection(sub));
        });
      }

      return {
        id,
        title,
        level,
        children,
        context: section.getContext(),
        line: lineno
      };
    };

    const rootSections = doc.getSections();
    return rootSections.map((s: any) => mapSection(s));

  } catch (error) {
    console.error("AST parsing error:", error);
    return [];
  }
};
