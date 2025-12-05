/**
 * FileTree Component
 * 
 * Location: Inside the LeftSidebar (Files tab).
 * Purpose: Displays the project directory structure recursively. 
 *          Handles expanding/collapsing folders and selecting files.
 */
import React, { useState } from 'react';
import { FileNode } from '../types';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';

interface FileTreeProps {
  nodes: FileNode[];
  onFileClick: (path: string) => void;
  level?: number;
}

const FileTree: React.FC<FileTreeProps> = ({ nodes, onFileClick, level = 0 }) => {
  if (!nodes || nodes.length === 0) {
    if (level === 0) return <div className="text-xs text-gray-600 italic p-4">No files found</div>;
    return null;
  }

  // Sort: Directories first, then files. Alphabetical within groups.
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.isDir === b.isDir) {
      return a.name.localeCompare(b.name);
    }
    return a.isDir ? -1 : 1;
  });

  return (
    <div className="flex flex-col gap-0.5">
      {sortedNodes.map((node) => (
        <FileTreeNode key={node.path} node={node} onFileClick={onFileClick} level={level} />
      ))}
    </div>
  );
};

interface FileTreeNodeProps {
  node: FileNode;
  onFileClick: (path: string) => void;
  level: number;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, onFileClick, level }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isDir) {
      setIsOpen(!isOpen);
    } else {
      onFileClick(node.path);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-1 pr-2 hover:bg-gray-800 rounded cursor-pointer text-sm transition-colors select-none group`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        <div className={`text-gray-500 transition-transform duration-200 ${node.isDir && isOpen ? 'rotate-0' : node.isDir ? '-rotate-90' : ''}`}>
          {node.isDir ? <ChevronDown size={14} /> : <span className="w-[14px] inline-block" />}
        </div>

        {node.isDir ? (
          <Folder size={14} className={`text-indigo-400 group-hover:text-indigo-300 transition-colors ${isOpen ? 'fill-indigo-400/20' : ''}`} />
        ) : (
          <File size={14} className="text-gray-500 group-hover:text-gray-400 transition-colors" />
        )}

        <span className={`truncate ${node.isDir ? 'text-gray-200 font-medium' : 'text-gray-300 group-hover:text-white'}`}>
          {node.name}
        </span>
      </div>

      {node.isDir && isOpen && node.children && (
        <div className="animate-in slide-in-from-top-1 fade-in duration-200">
          <FileTree nodes={node.children} onFileClick={onFileClick} level={level + 1} />
        </div>
      )}
    </div>
  );
};

export default FileTree;
