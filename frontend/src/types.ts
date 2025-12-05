export enum EditorMode {
  EDIT = 'EDIT',
  PREVIEW = 'PREVIEW',
  SPLIT = 'SPLIT'
}

export enum LeftTab {
  FILES = 'FILES',
  OUTLINE = 'OUTLINE'
}

export interface FileMetadata {
  name: string;
  handle?: FileSystemFileHandle;
}

export interface StructureNode {
  id: string;
  title: string;
  level: number;
  lineNumber: number;
}

export interface AIState {
  isLoading: boolean;
  error: string | null;
  suggestion: string | null;
}

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}
