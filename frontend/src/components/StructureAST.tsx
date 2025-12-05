import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseAST, AstNode } from '../services/asciidocService';
import { Hash, ChevronRight, ChevronDown } from 'lucide-react';

interface StructureASTProps {
  content: string;
  onNodeClick?: (line: number) => void;
}

const TreeNode: React.FC<{ node: AstNode; depth: number; onNodeClick?: (line: number) => void }> = ({ node, depth, onNodeClick }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex flex-col">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`
          flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer
          hover:bg-indigo-500/10 transition-colors group relative
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          if (node.children.length > 0) setIsOpen(!isOpen);
          if (node.line && onNodeClick) onNodeClick(node.line);
        }}
      >
        {/* Hover Glow Effect */}
        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <span className="text-indigo-400/70 group-hover:text-indigo-400 transition-colors shrink-0">
          {node.children.length > 0 ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <Hash size={12} />
          )}
        </span>

        <span className="text-sm text-gray-400 group-hover:text-gray-100 transition-colors truncate font-medium">
          {node.title || "Untitled Section"}
        </span>
      </motion.div>

      <AnimatePresence>
        {isOpen && node.children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-l border-indigo-500/10 ml-4"
          >
            {node.children.map((child, idx) => (
              <TreeNode key={idx} node={child} depth={depth + 1} onNodeClick={onNodeClick} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StructureAST: React.FC<StructureASTProps> = ({ content, onNodeClick }) => {
  const [tree, setTree] = useState<AstNode[]>([]);

  useEffect(() => {
    const nodes = parseAST(content);
    setTree(nodes);
  }, [content]);

  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="text-[10px] text-indigo-400/80 uppercase font-bold px-2 py-2 tracking-wider flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        AST View
      </div>

      {tree.length === 0 && (
        <div className="text-xs text-gray-600 italic p-4 text-center">
          No sections found. Start with = Title
        </div>
      )}

      {tree.map((node, idx) => (
        <TreeNode key={idx} node={node} depth={0} onNodeClick={onNodeClick} />
      ))}
    </div>
  );
};

export default StructureAST;
