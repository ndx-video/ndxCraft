import React, { useState, useEffect, useRef } from 'react';
import { Folder, ListTree, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { LeftTab, FileNode } from '../types';
import { parseBlocks, reorderBlocks, SectionBlock } from '../services/structureService';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import StructureAST from './StructureAST';
import FileTree from './FileTree';
import { Reorder } from 'framer-motion';

interface LeftSidebarProps {
  isOpen: boolean;
  activeTab: LeftTab;
  onTabChange: (tab: LeftTab) => void;
  content: string;
  onContentChange: (newContent: string) => void;
  fileTree?: FileNode[];
  onFileClick?: (path: string) => void;
  onNavigate?: (line: number) => void;
}

// Wrapper for Reorder.Item to isolate drag controls if needed
const SortableItem: React.FC<{
  item: SectionBlock & { id: string },
  onNavigate?: (line: number) => void,
  onDragStart: () => void,
  onDragEnd: () => void
}> = ({ item, onNavigate, onDragStart, onDragEnd }) => {
  // Removed explicit drag controls to fix drag scaling issue.
  // Letting Reorder.Item handle it natively usually works better in scroll containers.

  return (
    <Reorder.Item
      value={item}
      id={item.id}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group flex items-center gap-2 p-2 rounded bg-gray-800/50 hover:bg-gray-800 border border-transparent hover:border-indigo-500/30 transition-all mb-1 select-none relative cursor-grab active:cursor-grabbing"
      whileDrag={{ scale: 1.02, boxShadow: "0 8px 20px rgba(0,0,0,0.5)", zIndex: 50 }}
      onClick={() => {
        if (onNavigate) onNavigate(item.startLine);
      }}
    >
      {/* Drag Handle Icon (Visual only now, whole item is draggable) */}
      <div className="text-gray-600 hover:text-gray-400 p-1">
        <GripVertical size={14} />
      </div>

      <div
        className="flex-1 text-sm text-gray-300 truncate"
        style={{ paddingLeft: `${Math.max(0, (item.level - 1) * 12)}px` }}
      >
        {item.level === 0 ? <span className="text-gray-500 italic">Preamble</span> : item.title}
      </div>
      <div className="text-[10px] text-gray-600 font-mono">{item.level > 0 ? `H${item.level}` : 'PRE'}</div>

      {/* Drop Indicator Highlight (Visualized by Framer Motion's layout animation automatically) */}
    </Reorder.Item>
  );
};

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isOpen, activeTab, onTabChange, content, onContentChange, fileTree, onFileClick, onNavigate
}) => {
  const [useAst, setUseAst] = useState(false);
  const [items, setItems] = useState<(SectionBlock & { id: string })[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Sync content to items, but try to preserve order if just a text change within a block?
  // For simplicity, we re-parse. To keep framer motion happy, we need stable IDs.
  useEffect(() => {
    // If dragging, DO NOT update items from content, as it will break the drag state
    if (isDragging) return;

    const parsed = parseBlocks(content);
    // Generate stable-ish IDs based on content hash or similar
    // Note: Using index in ID is what caused the bug. 
    // We try to make it slightly more stable by including title/level, but index is still needed for uniqueness.
    // However, by blocking updates during drag, we solve the immediate issue.
    const withIds = parsed.map((b, idx) => ({
      ...b,
      id: `${idx}-${b.title}-${b.level}` // Simple ID
    }));
    setItems(withIds);
  }, [content, isDragging]);

  if (!isOpen) return null;

  const handleReorder = (newOrder: (SectionBlock & { id: string })[]) => {
    // Only update local state during drag
    setItems(newOrder);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // Now commit the change to the parent
    const newContent = reorderBlocks(items);
    onContentChange(newContent);
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 transition-all duration-300">
      {/* Tabs */}
      <div className="h-6 flex bg-black border-b border-gray-800">
        <button
          onClick={() => onTabChange(LeftTab.FILES)}
          className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${activeTab === LeftTab.FILES
            ? 'bg-gray-900 text-white border-b-2 border-indigo-500'
            : 'text-gray-600 hover:text-gray-400 hover:bg-gray-900'
            }`}
        >
          <Folder size={12} /> Files
        </button>
        <button
          onClick={() => onTabChange(LeftTab.OUTLINE)}
          className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${activeTab === LeftTab.OUTLINE
            ? 'bg-gray-900 text-white border-b-2 border-indigo-500'
            : 'text-gray-600 hover:text-gray-400 hover:bg-gray-900'
            }`}
        >
          <ListTree size={12} /> Structure
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {activeTab === LeftTab.FILES && (
          <div className="flex flex-col gap-1">
            <div className="px-2 py-1 text-[10px] uppercase font-bold text-gray-500 mb-1">
              Project Files
            </div>
            {fileTree ? (
              <FileTree nodes={fileTree} onFileClick={onFileClick || (() => { })} />
            ) : (
              <div className="text-xs text-gray-600 italic p-2">Loading...</div>
            )}
          </div>
        )}

        {activeTab === LeftTab.OUTLINE && (
          <div className="flex flex-col gap-2">
            {/* Improved Toggle UI */}
            <div className="flex items-center justify-between px-3 py-3 bg-gray-800/30 rounded-lg border border-gray-800 mb-2 mx-1">
              <span className="text-xs font-medium text-gray-400">View Mode</span>
              <div className="flex items-center gap-2">
                <Label htmlFor="mode-toggle" className={`text-xs font-bold transition-colors ${!useAst ? 'text-indigo-400' : 'text-gray-600'}`}>
                  Blocks
                </Label>
                <Switch
                  id="mode-toggle"
                  checked={useAst}
                  onCheckedChange={setUseAst}
                  className="data-[state=checked]:bg-indigo-600"
                />
                <Label htmlFor="mode-toggle" className={`text-xs font-bold transition-colors ${useAst ? 'text-indigo-400' : 'text-gray-600'}`}>
                  AST
                </Label>
              </div>
            </div>

            {useAst ? (
              <StructureAST content={content} onNodeClick={onNavigate} />
            ) : (
              <div className="px-1">
                <p className="text-[10px] text-gray-500 uppercase font-bold px-2 py-1 mb-2">Drag to Reorder Sections</p>
                <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="flex flex-col gap-1">
                  {items.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onNavigate={onNavigate}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </Reorder.Group>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;


