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
          const blocks = doc.findBy((b: any) => b.getLineNumber() !== undefined);
          blocks.forEach((block: any) => {
            block.addRole(`data-line-${block.getLineNumber()}`);
            // We can't easily add arbitrary attributes to the HTML tag directly via the API 
            // without writing a custom converter. 
            // However, adding a role adds a class, which we can parse.
            // BETTER APPROACH: Use 'sourcemap' option and 'addRole' is a workaround.
            // Let's try to set the attribute directly if the converter supports it, 
            // or use the class hack: class="... data-line-123"

            // Ideally we want <p data-line="123">. 
            // Asciidoctor JS default converter doesn't always output custom attributes on all blocks.
            // But it DOES output roles as classes.
            // So we will look for class="... data-line-123 ..." in the Preview component.
          });
          return doc;
        });
      });
    });
  }
} catch (e) {
  console.warn("Failed to register Asciidoctor extensions", e);
}

export const convertToHtml = (adocContent: string, cursorOffset?: number): string => {
  if (!asciidoctorInstance) {
    return "<div class='text-red-500 p-4'>Error: Asciidoctor rendering engine not loaded.</div>";
  }
  try {
    let contentToConvert = adocContent;

    // Inject Cursor Marker if offset is provided
    if (cursorOffset !== undefined && cursorOffset >= 0 && cursorOffset <= adocContent.length) {
      const marker = "+++<span id='ndx-cursor-marker'></span>+++";
      contentToConvert = adocContent.slice(0, cursorOffset) + marker + adocContent.slice(cursorOffset);
    }

    // attributes: { showtitle: true } allows the Level 0 header to be rendered
    return asciidoctorInstance.convert(contentToConvert, {
      safe: 'safe',
      sourcemap: true, // Enable sourcemap calculation
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
