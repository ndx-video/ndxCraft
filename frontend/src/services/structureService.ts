import { StructureNode } from '../types';

export interface SectionBlock {
  title: string;
  level: number;
  lines: string[];
}

/**
 * Parses the AsciiDoc content into a flat list of sections based on headers.
 * Includes preamble as the first block if it exists.
 */
export const parseBlocks = (content: string): SectionBlock[] => {
  const lines = content.split('\n');
  const blocks: SectionBlock[] = [];
  let currentLines: string[] = [];
  let currentTitle = "Preamble";
  let currentLevel = 0;

  lines.forEach((line) => {
    const headerMatch = line.match(/^(=+)\s+(.+)$/);
    if (headerMatch) {
      // If we have accumulated lines for the previous block, push it
      if (currentLines.length > 0) {
        blocks.push({
          title: currentTitle,
          level: currentLevel,
          lines: [...currentLines]
        });
      }
      // Start new block
      currentTitle = headerMatch[2];
      currentLevel = headerMatch[1].length;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  });

  // Push the final block
  if (currentLines.length > 0) {
    blocks.push({
      title: currentTitle,
      level: currentLevel,
      lines: currentLines
    });
  }

  return blocks;
};

/**
 * Reconstructs the full text from the blocks.
 */
export const stringifyBlocks = (blocks: SectionBlock[]): string => {
  return blocks.map(b => b.lines.join('\n')).join('\n');
};

/**
 * Moves a block from one index to another.
 */
export const moveBlock = (content: string, fromIndex: number, direction: 'up' | 'down'): string => {
  const blocks = parseBlocks(content);
  const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;

  if (toIndex < 0 || toIndex >= blocks.length) return content;

  // Swap
  const temp = blocks[fromIndex];
  blocks[fromIndex] = blocks[toIndex];
  blocks[toIndex] = temp;

  return stringifyBlocks(blocks);
};
